/**
 * @file museum.js
 * @description 首页、展馆与展柜界面。已归藏文物的详情由副本模块提供。
 */
Game.Museum = (() => {
  let cleanup = () => {};
  function home() {
    const user = Game.Auth.current(),
      save = user ? Game.Store.load() : null;
    return `<section class="home-screen"><div class="home-art"></div><div class="home-shade"></div><header class="home-top"><span>湖北省博物馆 · 荆楚文化主题探索</span><button class="account" data-action="account"><span class="avatar">${user ? Game.UI.esc(user[0]) : '客'}</span>${user ? Game.UI.esc(user) : '登录 / 注册'} <span class="arrow">↗</span></button></header><div class="home-copy"><div class="seal">荆楚</div><p class="eyebrow">湖北省博物馆 · 云游荆楚</p><h1>溯时<span>荆楚遗珍</span></h1><p class="home-desc">从一声钟鸣出发，走近文物曾经的世界。<br>循线索访古，亲手找回千年钟鸣。</p><nav class="home-menu"><button class="primary" data-go="museum">进入展馆 <span>→</span></button><button data-action="continue" ${save?.currentScene || save?.lastExpedition ? '' : 'disabled'}>继续探索 <span>${save?.currentScene || save?.lastExpedition ? '↗' : '暂无存档'}</span></button></nav></div><footer class="home-bottom"><button class="text-button" data-action="settings">探索设置</button></footer></section>`;
  }
  function panorama() {
    return `${Game.UI.header('湖北省博物馆')}<section class="museum-scene"><div class="museum-image"></div><div class="museum-intro"><p class="eyebrow">湖北省博物馆 · 荆楚文化长卷</p><h1>荆楚千秋</h1><p>循钟声入楚地，向烟火处寻珍。</p><span class="exp-gallery-count">已归藏 ${Game.Collection.count()} / ${Game.Artifacts.length}${Game.Collection.full() ? ' · 十二遗珍齐归' : ' · 选择展厅开始寻珍'}</span></div><div class="hall-portals">${Game.Halls.map((h, i) => `<button class="hall-portal portal-${i}" data-go="hall" data-id="${h.id}"><small>〇${['一', '二', '三', '四'][i]}</small><strong>${h.name}</strong><span>进入展厅 →</span></button>`).join('')}</div><button class="city-guide" data-action="city-guide">◇ 观馆指引</button></section>`;
  }
  function hall(id) {
    let h = Game.Halls.find((x) => x.id === id) || Game.Halls[0],
      items = Game.Artifacts.filter((a) => a.hall === h.id);
    return `${Game.UI.header(h.name, 'museum', '<button class="text-button" id="overview">展品总览</button>')}<section class="hall-screen"><div class="hall-heading"><p class="eyebrow">${h.subtitle}</p><h1>${h.name}</h1><p>${h.intro}</p></div><div class="exhibit-track" id="track" tabindex="0" aria-label="横向文物展柜">${items.map((a, i) => `<article class="exhibit" data-artifact="${a.id}"><div class="spotlight"></div><div class="glass-case"><div class="artifact ${Game.Collection.isUnlocked(a.id) ? '' : 'silhouette'}">${Game.Artwork(a.kind)}</div><span class="case-state">${Game.Collection.isUnlocked(a.id) ? '◆ 礼乐档案已归藏' : '◇ 等待你的探索'}</span><div class="pedestal"></div></div><div class="artifact-caption"><small>${a.era} / ${String(i + 1).padStart(2, '0')}</small><h2>${a.name}</h2><p>${a.description}</p>${a.id === 'bells' ? `<button class="primary" data-go="map" data-id="palace">${Game.Collection.isUnlocked(a.id) ? '再入楚宫 · 回望钟鸣' : '开启千年钟鸣 · 约5–10分钟 →'}</button>` : `<button class="primary" data-exp-launch="${a.id}">${Game.Collection.isUnlocked(a.id) ? '重游此篇 · 回望遗珍' : '进入文物副本 · 寻回遗珍 →'}</button>`}${Game.Collection.isUnlocked(a.id) ? `<button class="exp-details-button" data-exp-action="details" data-relic="${a.id}">文物详情 / 剧情回溯</button>` : ''}</div></article>`).join('')}</div><div class="slider-controls"><button id="prev" aria-label="上一件文物">←</button><span id="slide-count">01 / ${String(items.length).padStart(2, '0')}</span><button id="next" aria-label="下一件文物">→</button><small>滚轮 / 拖拽 / 左右切换</small></div></section>`;
  }
  function bindHall(id) {
    cleanup();
    const track = document.getElementById('track'),
      cards = [...track.children];
    let index = 0,
      down = false,
      startX = 0,
      startScroll = 0,
      moved = false;
    const center = () => {
      let best = Infinity;
      cards.forEach((el, i) => {
        const d = Math.abs(
          el.offsetLeft + el.offsetWidth / 2 - (track.scrollLeft + track.clientWidth / 2),
        );
        if (d < best) {
          best = d;
          index = i;
        }
      });
      document.getElementById('slide-count').textContent =
        `${String(index + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
      document.getElementById('prev').disabled = index === 0;
      document.getElementById('next').disabled = index === cards.length - 1;
    };
    function go(i) {
      index = Math.max(0, Math.min(cards.length - 1, i));
      track.scrollTo({
        left: cards[index].offsetLeft + cards[index].offsetWidth / 2 - track.clientWidth / 2,
        behavior: 'smooth',
      });
    }
    document.getElementById('prev').onclick = () => go(index - 1);
    document.getElementById('next').onclick = () => go(index + 1);
    track.addEventListener('scroll', center);
    track.onwheel = (e) => {
      e.preventDefault();
      track.scrollLeft += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    };
    track.onkeydown = (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(index + 1);
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(index - 1);
      }
    };
    track.onpointerdown = (e) => {
      if (e.target.closest('button')) return;
      down = true;
      moved = false;
      startX = e.clientX;
      startScroll = track.scrollLeft;
      track.setPointerCapture(e.pointerId);
      track.classList.add('dragging');
    };
    track.onpointermove = (e) => {
      if (down) {
        moved = moved || Math.abs(e.clientX - startX) > 5;
        track.scrollLeft = startScroll - (e.clientX - startX);
      }
    };
    track.onpointerup = track.onpointercancel = () => {
      if (!down) return;
      down = false;
      track.classList.remove('dragging');
      center();
      go(index);
    };
    track.addEventListener(
      'click',
      (e) => {
        if (moved) {
          e.preventDefault();
          e.stopPropagation();
          moved = false;
        }
      },
      true,
    );
    document.getElementById('overview').onclick = () => {
      Game.UI.modal(
        '展品总览',
        `<div class="overview-grid">${cards
          .map((el, i) => {
            const a = Game.Artifacts.find((x) => x.id === el.dataset.artifact);
            return `<button data-slide="${i}">${Game.Artwork(a.kind)}<strong>${a.name}</strong><small>${Game.Collection.isUnlocked(a.id) ? '已归藏' : '待探索'}</small></button>`;
          })
          .join('')}</div>`,
      );
      document.querySelectorAll('[data-slide]').forEach(
        (b) =>
          (b.onclick = () => {
            Game.UI.close();
            go(+b.dataset.slide);
          }),
      );
    };
    requestAnimationFrame(() => {
      go(0);
      center();
    });
    cleanup = () => {
      track.onwheel = null;
      track.onpointerdown = null;
      track.onpointermove = null;
      track.onpointerup = null;
    };
  }
  return { home, panorama, hall, bindHall, cleanup: () => cleanup() };
})();
