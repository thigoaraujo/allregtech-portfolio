/* AllRegTech · site institucional. Sem dependências.
   1) entrada das seções na rolagem, uma vez só (a página funciona inteira sem isto)
   2) o menu do celular fecha ao escolher um destino
   3) o item do menu acompanha a seção visível (só na página inicial)
   4) cabeçalho ganha sombra depois que a página rola
   5) abas: telas das soluções e a trilha da jornada (que também move o fio e marca as etapas feitas)
   6) profundidade do palco do herói ao mover o mouse
   7) a ficha do herói avança uma etapa, uma vez, quando está na tela
   8) índice das soluções: a tela ao lado acompanha a linha sob o mouse ou o foco */
(function(){
  'use strict';
  var doc = document.documentElement;
  var mq = function(q){ return !!(window.matchMedia && window.matchMedia(q).matches); };
  var menos = mq('(prefers-reduced-motion: reduce)');

  // 1) entradas. Quem entra no mesmo lote é escalonado (--i); depois o observador solta o elemento.
  //    A classe .js só é posta no fim, com tudo pronto: se algo falhar antes, nada fica escondido.
  if (!menos && 'IntersectionObserver' in window) {
    var alvos = document.querySelectorAll('.surge, .revela');
    var restam = alvos.length;
    var vigia = new IntersectionObserver(function(itens){
      var n = 0;
      itens.forEach(function(it){
        if (!it.isIntersecting) return;
        it.target.style.setProperty('--i', n++);
        it.target.classList.add('visto');
        vigia.unobserve(it.target);
        restam--;
      });
      if (restam <= 0) vigia.disconnect();   // todos já entraram: nada mais a observar
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    alvos.forEach(function(el){ vigia.observe(el); });
    // impressão e "salvar como PDF" saem com tudo visível
    window.addEventListener('beforeprint', function(){ alvos.forEach(function(el){ el.classList.add('visto'); }); });
    doc.classList.add('js');
  }

  var cel = document.querySelector('.menu-cel');
  if (cel) {
    cel.addEventListener('click', function(e){
      if (e.target.closest('nav a')) cel.removeAttribute('open');
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && cel.hasAttribute('open')) { cel.removeAttribute('open'); cel.querySelector('summary').focus(); }
    });
    document.addEventListener('click', function(e){
      if (cel.hasAttribute('open') && !cel.contains(e.target)) cel.removeAttribute('open');
    });
  }

  var links = Array.prototype.slice.call(document.querySelectorAll('.menu a[href^="#"]'));
  if (links.length && 'IntersectionObserver' in window) {
    var alvo = {};
    links.forEach(function(a){ var s = document.querySelector(a.getAttribute('href')); if (s) alvo[s.id] = a; });
    var marca = new IntersectionObserver(function(itens){
      itens.forEach(function(it){
        var a = alvo[it.target.id];
        if (a && it.isIntersecting) { links.forEach(function(l){ l.classList.remove('on'); }); a.classList.add('on'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(alvo).forEach(function(id){ marca.observe(document.getElementById(id)); });
  }

  // 4) sombra do cabeçalho: um sentinela de 1px no topo, sem ouvir o scroll
  var topo = document.querySelector('.topo');
  if (topo && 'IntersectionObserver' in window) {
    var sentinela = document.createElement('div');
    sentinela.setAttribute('aria-hidden', 'true');
    sentinela.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:8px;pointer-events:none';
    document.body.prepend(sentinela);
    new IntersectionObserver(function(itens){
      topo.classList.toggle('rolou', !itens[0].isIntersecting);
    }).observe(sentinela);
  }

  // 5) abas da demonstração: clique, setas, Home e End (padrão de tablist)
  document.querySelectorAll('[data-abas]').forEach(function(caixa){
    var abas = Array.prototype.slice.call(caixa.querySelectorAll('[role="tab"]'));
    function vai(nova, foco){
      var de = abas.findIndex(function(a){ return a.getAttribute('aria-selected') === 'true'; });
      var para = abas.indexOf(nova);
      if (para === de) return;
      abas.forEach(function(a, i){
        var on = a === nova;
        a.setAttribute('aria-selected', on ? 'true' : 'false');
        a.tabIndex = on ? 0 : -1;
        a.classList.toggle('feita', i < para);
        var p = document.getElementById(a.getAttribute('aria-controls'));
        if (!p) return;
        // o painel que sai vai para o lado oposto ao da aba escolhida
        p.classList.toggle('de-tras', i < para);
        p.classList.toggle('on', on);
      });
      caixa.style.setProperty('--at', para);
      // no celular a trilha rola de lado: traz a etapa escolhida para a vista sem mexer na página
      var lista = nova.parentNode;
      if (lista.scrollWidth > lista.clientWidth) {
        lista.scrollTo({ left: Math.max(0, nova.offsetLeft - 24), behavior: menos ? 'auto' : 'smooth' });
      }
      if (foco) nova.focus();
    }
    var prox = caixa.querySelector('[data-proxima]');
    if (prox) prox.addEventListener('click', function(){
      var i = abas.findIndex(function(a){ return a.getAttribute('aria-selected') === 'true'; });
      vai(abas[(i + 1) % abas.length]);
    });
    abas.forEach(function(a){
      a.addEventListener('click', function(){ vai(a); });
      a.addEventListener('keydown', function(e){
        var i = abas.indexOf(a), n = abas.length, j = null;
        if (e.key === 'ArrowRight') j = (i + 1) % n;
        else if (e.key === 'ArrowLeft') j = (i - 1 + n) % n;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = n - 1;
        if (j !== null) { e.preventDefault(); vai(abas[j], true); }
      });
    });
  });

  // 6) profundidade: só com mouse, tela larga e sem pedido de menos movimento.
  //    Mede a caixa uma vez por entrada e escreve no máximo uma vez por quadro.
  var compo = document.querySelector('.palco');
  if (compo && !menos && mq('(hover: hover) and (pointer: fine)')) {
    var caixa = null, pedido = 0, px = 0, py = 0;
    var aplica = function(){ pedido = 0; compo.style.setProperty('--px', px.toFixed(3)); compo.style.setProperty('--py', py.toFixed(3)); };
    compo.addEventListener('pointerenter', function(){
      if (!mq('(min-width: 901px)')) return;
      caixa = compo.getBoundingClientRect();
      compo.classList.add('fundo');
    });
    compo.addEventListener('pointermove', function(e){
      if (!caixa) return;
      px = Math.max(-1, Math.min(1, ((e.clientX - caixa.left) / caixa.width) * 2 - 1));
      py = Math.max(-1, Math.min(1, ((e.clientY - caixa.top) / caixa.height) * 2 - 1));
      if (!pedido) pedido = requestAnimationFrame(aplica);
    });
    compo.addEventListener('pointerleave', function(){
      caixa = null; px = py = 0;
      if (!pedido) pedido = requestAnimationFrame(aplica);
    });
  }

  // 7) a ficha passa de "Fila de espera" para "Agendamento/Contato". Com menos movimento, já aparece no estado final.
  var ficha = document.querySelector('[data-ficha]');
  if (ficha) {
    var avanca = function(){
      ficha.classList.add('avancou');
      var antes = ficha.querySelector('[data-reg-antes]'), depois = ficha.querySelector('[data-reg-depois]');
      if (antes) antes.hidden = true;
      if (depois) depois.hidden = false;
    };
    if (menos || !('IntersectionObserver' in window)) avanca();
    else {
      var espera = doc.classList.contains('heroi-ok') ? 900 : 2200;
      var olho = new IntersectionObserver(function(itens){
        if (!itens[0].isIntersecting) return;
        olho.disconnect();
        setTimeout(avanca, espera);
      }, { threshold: 0.6 });
      olho.observe(ficha);
    }
  }

  // 8) índice: troca a captura com um esmaecer curto; só existe com a coluna da tela visível (tela larga)
  var indice = document.querySelector('[data-indice]');
  if (indice) {
    var quadro = indice.querySelector('.indice-quadro'), img = quadro && quadro.querySelector('img');
    var legenda = indice.querySelector('[data-indice-legenda]');
    var atual = null, timer = 0;
    var mostra = function(linha){
      if (!img || linha === atual) return;
      atual = linha;
      indice.querySelectorAll('.indice-linha.on').forEach(function(l){ l.classList.remove('on'); });
      linha.classList.add('on');
      var nome = linha.getAttribute('data-tela');
      if (legenda) legenda.textContent = nome ? linha.querySelector('b').textContent + ' · tela real, dados fictícios' : linha.querySelector('b').textContent + ' · sem captura publicada';
      clearTimeout(timer);
      quadro.classList.add('trocando');
      timer = setTimeout(function(){
        quadro.classList.toggle('vazio', !nome);
        quadro.classList.toggle('cel', linha.hasAttribute('data-cel'));
        if (!nome) { quadro.classList.remove('trocando'); return; }
        var fim = function(){ quadro.classList.remove('trocando'); };
        img.onload = fim; img.onerror = fim;
        img.src = 'assets/telas/' + nome + '-p.webp?v=2';
        if (img.complete) fim();
      }, menos ? 0 : 140);
    };
    indice.querySelectorAll('.indice-linha').forEach(function(l){
      l.addEventListener('pointerenter', function(){ mostra(l); });
      l.addEventListener('focus', function(){ mostra(l); });
    });
  }
})();
