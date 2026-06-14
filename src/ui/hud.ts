import type { ResolvedAbility } from '../sim/sim';
import type { IWorld, MarketInfo } from '../world_api';
import { Renderer } from '../render/renderer';
import {
  ABILITIES, CLASSES, DUNGEON_LIST, DUNGEON_X_THRESHOLD, ITEMS, MOBS, NPCS, QUESTS,
  WORLD_MAX_X, WORLD_MAX_Z, WORLD_MIN_X, WORLD_MIN_Z, ZONES, dungeonAt, zoneAt,
  zoneWelcomeText,
} from '../sim/data';
import type { ZoneDef } from '../sim/data';
import type { AbilityDef, EquipSlot, InvSlot, PlayerClass, ResourceType, Stats } from '../sim/types';
import { AbilityEffect, CONSUME_DURATION, Entity, GCD, ItemDef, SimEvent, dist2d, xpForLevel, MAX_LEVEL, MELEE_RANGE } from '../sim/types';
import { terrainHeight, WATER_LEVEL, roadDistance } from '../sim/world';
import { Meters } from './meters';
import { audio } from '../game/audio';
import { music } from '../game/music';
import { iconDataUrl, QUALITY_COLOR } from './icons';
import { Keybinds, BIND_ACTIONS, BIND_CATEGORIES, isReservedCode, keyLabel } from '../game/keybinds';
import { Settings, GameSettings, SETTING_RANGES } from '../game/settings';
import { chatPlayerContextActions } from './player_context_menu';
import { formatMoney as formatLocalizedMoney, formatNumber, moneyParts, t, type TranslationKey } from './i18n';

// hooks main wires after Input exists (the options menu drives input, audio,
// graphics, and logout, all of which live outside the HUD)
export interface OptionsHooks {
  logout(): void;
  captureKey(cb: (code: string | null) => void): void;
  settings: Settings;
  onSettingChange(key: keyof GameSettings, value: number): void;
}

export interface ReportHooks {
  submit(targetPid: number, reason: string, details: string): Promise<void>;
  submitByName?(targetName: string, reason: string, details: string): Promise<void>;
}

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => document.querySelector(sel) as T;
const esc = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const FAMILY_GLYPH: Record<string, string> = {
  beast: '🐾', humanoid: '🗡️', murloc: '🐟', spider: '🕷️', kobold: '⛏️', undead: '💀',
  troll: '🦴', ogre: '👊', elemental: '🌀', dragonkin: '🐉',
};
const CLASS_GLYPH: Record<string, string> = {
  warrior: '⚔️', paladin: '🔨', hunter: '🏹', rogue: '🗡️', priest: '✝️',
  shaman: '🌩️', mage: '🔮', warlock: '🕯️', druid: '🐻',
};
const CLASS_NAME_KEYS: Record<PlayerClass, TranslationKey> = {
  warrior: 'classes.warrior',
  paladin: 'classes.paladin',
  hunter: 'classes.hunter',
  rogue: 'classes.rogue',
  priest: 'classes.priest',
  shaman: 'classes.shaman',
  mage: 'classes.mage',
  warlock: 'classes.warlock',
  druid: 'classes.druid',
};
const RESOURCE_LABEL_KEYS: Record<ResourceType, TranslationKey> = {
  mana: 'abilityUi.resources.mana',
  rage: 'abilityUi.resources.rage',
  energy: 'abilityUi.resources.energy',
};
const FORM_LABEL_KEYS: Record<'bear' | 'cat', TranslationKey> = {
  bear: 'abilityUi.forms.bear',
  cat: 'abilityUi.forms.cat',
};
type ItemQuality = NonNullable<ItemDef['quality']>;
const ITEM_SLOT_LABEL_KEYS: Record<EquipSlot, TranslationKey> = {
  mainhand: 'itemUi.slots.mainhand',
  chest: 'itemUi.slots.chest',
  legs: 'itemUi.slots.legs',
  feet: 'itemUi.slots.feet',
};
const ITEM_QUALITY_LABEL_KEYS: Record<ItemQuality, TranslationKey> = {
  poor: 'itemUi.quality.poor',
  common: 'itemUi.quality.common',
  uncommon: 'itemUi.quality.uncommon',
  rare: 'itemUi.quality.rare',
  epic: 'itemUi.quality.epic',
};
const ITEM_KIND_LABEL_KEYS: Record<ItemDef['kind'], TranslationKey> = {
  weapon: 'itemUi.kind.weapon',
  armor: 'itemUi.kind.armor',
  quest: 'itemUi.kind.quest',
  junk: 'itemUi.kind.junk',
  food: 'itemUi.kind.food',
  drink: 'itemUi.kind.drink',
};
const ITEM_STAT_LABEL_KEYS: Partial<Record<keyof Stats, TranslationKey>> = {
  armor: 'itemUi.stats.armor',
  str: 'itemUi.stats.str',
  agi: 'itemUi.stats.agi',
  sta: 'itemUi.stats.sta',
  int: 'itemUi.stats.int',
  spi: 'itemUi.stats.spi',
};

// Classic class colors (CLASSES[cls].color is a 0xRRGGBB number) as a CSS
// string, used to color-code party members on the minimap and in the frames.
const classCss = (cls: string): string =>
  '#' + ((CLASSES as Record<string, { color: number }>)[cls]?.color ?? 0x5fa8ff).toString(16).padStart(6, '0');

// Party frames dim and the minimap pins members to the rim once they pass
// this range (yards) — just inside the server's ~120 yd interest scope.
const PARTY_RANGE_YD = 100;

// yards past a zone boundary before the crossing banner/welcome commits
const ZONE_BANNER_DEADBAND = 5;
const IGNORED_CHAT_NAMES_KEY = 'woc_ignored_chat_names';
const BIND_CATEGORY_LABEL_KEYS: Partial<Record<string, TranslationKey>> = {
  Movement: 'hud.keybinds.categories.movement',
  Targeting: 'hud.keybinds.categories.targeting',
  Interface: 'hud.keybinds.categories.interface',
  'Action Bar': 'hud.keybinds.categories.actionBar',
};
const BIND_ACTION_LABEL_KEYS: Partial<Record<string, TranslationKey>> = {
  forward: 'hud.keybinds.actions.forward',
  back: 'hud.keybinds.actions.back',
  turnLeft: 'hud.keybinds.actions.turnLeft',
  turnRight: 'hud.keybinds.actions.turnRight',
  strafeLeft: 'hud.keybinds.actions.strafeLeft',
  strafeRight: 'hud.keybinds.actions.strafeRight',
  jump: 'hud.keybinds.actions.jump',
  autorun: 'hud.keybinds.actions.autorun',
  target: 'hud.keybinds.actions.target',
  interact: 'hud.keybinds.actions.interact',
  char: 'hud.keybinds.actions.char',
  spellbook: 'hud.keybinds.actions.spellbook',
  questlog: 'hud.keybinds.actions.questlog',
  map: 'hud.keybinds.actions.map',
  bags: 'hud.keybinds.actions.bags',
  nameplates: 'hud.keybinds.actions.nameplates',
  meters: 'hud.keybinds.actions.meters',
  social: 'hud.keybinds.actions.social',
  arena: 'hud.keybinds.actions.arena',
  chat: 'hud.keybinds.actions.chat',
};
const CHAT_TEMPLATE_KEYS = {
  party: 'hud.chat.templates.party',
  yell: 'hud.chat.templates.yell',
  whisper: 'hud.chat.templates.whisper',
  toWhisper: 'hud.chat.templates.toWhisper',
  general: 'hud.chat.templates.general',
  guild: 'hud.chat.templates.guild',
  officer: 'hud.chat.templates.officer',
  say: 'hud.chat.templates.say',
} satisfies Record<string, TranslationKey>;

export class Hud {
  private static readonly BAR_ABILITY_SLOTS = 11; // bar slots 1..11; slot 0 is the fixed Attack toggle
  private abilityButtons: { btn: HTMLButtonElement; label: HTMLSpanElement; keybindEl: HTMLSpanElement; cdOverlay: HTMLDivElement; cdText: HTMLDivElement; lastIcon: string }[] = [];
  private slotMap: (string | null)[] = []; // index = barSlot-1, value = ability id
  private dragFromSlot: number | null = null;
  private optionsHooks: OptionsHooks | null = null;
  private reportHooks: ReportHooks | null = null;
  private optionsView: 'main' | 'keybinds' | 'graphics' | 'audio' = 'main';
  private capturingKey: { action: string; index: number } | null = null; // binding awaiting a key
  private keybindNote = '';
  private chatLogEl = $('#chatlog');
  private combatLogEl = $('#combatlog');
  private errorEl = $('#error-msg');
  private bannerEl = $('#banner');
  private tooltipEl = $('#tooltip');
  private errorTimer: number | undefined;
  private bannerTimer: number | undefined;
  private minimapCtx: CanvasRenderingContext2D;
  private minimapBg: HTMLCanvasElement;
  private mapBg: HTMLCanvasElement | null = null;
  private openLootMobId: number | null = null;
  private openVendorNpcId: number | null = null;
  private openGossipNpcId: number | null = null;
  private openQuestDetailId: string | null = null;
  private selectedQuestLogId: string | null = null;
  private questDialogReturnFocus: HTMLElement | null = null;
  private questLogReturnFocus: HTMLElement | null = null;
  private lastPortraitTarget = -999;
  // trading: locally staged offer, pushed to the server on change
  private stagedTrade: { items: InvSlot[]; copper: number } = { items: [], copper: 0 };
  private tradeWasOpen = false;
  private lastTradeSig = '';
  private lastPartySig = '';
  private lastArenaSig = '';
  private lastArenaStatusSig = '';
  // World Market (the Merchant's auction house)
  private marketOpen = false;
  private marketTab: 'browse' | 'sell' | 'collect' = 'browse';
  private marketSellItem: string | null = null; // bag item staged for listing
  private lastMarketSig = '';
  // all-time ladder, fetched best-effort from the server (online only)
  private arenaAllTime: { name: string; class: string; level: number; rating: number; wins: number; losses: number }[] | null = null;
  private arenaLbFetchedAt = 0;
  private lastCombatEventAt = 0;
  private lastZoneId = '';
  private mapZoneId = ''; // zone the cached map-window canvas was rendered for
  private ignoredChatNames = new Set<string>();
  private socialTab: 'friends' | 'guild' | 'ignore' = 'friends';
  // split signatures: structural changes (tab, guild membership) rebuild the
  // whole panel; content-only changes (a friend's presence) refresh just the
  // list, so an open typeahead / half-typed name survives a snapshot
  private lastSocialStruct = '';
  private lastSocialContent = '';
  private socialNotice: { text: string; error: boolean } | null = null;
  private socialSuggestTimer: number | undefined;
  // current typeahead state: which input, its results, and the keyboard-
  // highlighted row (-1 = none), so Enter/Arrow keys can pick a suggestion
  private socialSuggest: { field: string; items: { name: string; cls: string; level: number }[]; index: number } = { field: '', items: [], index: -1 };

  private meters: Meters;

  constructor(private sim: IWorld, private renderer: Renderer, private keybinds: Keybinds) {
    this.ignoredChatNames = this.loadIgnoredChatNames();
    this.meters = new Meters(sim);
    this.bindLogTabs();
    this.loadSlotMap();
    this.buildActionBar();
    this.refreshKeybindLabels();
    this.buildXpTicks();
    document.addEventListener('woc:languagechange', () => this.refreshLocalizedDynamicUi());
    $('#pf-name').textContent = sim.player.name;
    this.drawPortrait($('#pf-portrait') as unknown as HTMLCanvasElement, CLASS_GLYPH[sim.cfg.playerClass], CLASSES[sim.cfg.playerClass].color);
    const mm = $('#minimap') as unknown as HTMLCanvasElement;
    this.minimapCtx = mm.getContext('2d')!;
    this.minimapBg = this.renderTerrainCanvas(140, { minX: WORLD_MIN_X, maxX: WORLD_MAX_X, minZ: WORLD_MIN_Z, maxZ: WORLD_MAX_Z });
    $('#release-btn').addEventListener('click', () => { this.sim.releaseSpirit(); });
    // classic WoW: the player interaction menu opens from the target portrait
    $('#target-frame').addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      const tid = this.sim.player.targetId;
      const t = tid !== null ? this.sim.entities.get(tid) : null;
      if (t && t.kind === 'player' && t.id !== this.sim.playerId) {
        this.openContextMenu(t.id, t.name, (ev as MouseEvent).clientX, (ev as MouseEvent).clientY);
      }
    });
    $('#mm-char').addEventListener('click', () => this.toggleChar());
    $('#mm-spell').addEventListener('click', () => this.toggleSpellbook());
    $('#mm-quest').addEventListener('click', () => this.toggleQuestLog());
    $('#mm-map').addEventListener('click', () => this.toggleMap());
    $('#map-close').addEventListener('click', () => { $('#map-window').style.display = 'none'; });
    $('#mm-bag').addEventListener('click', () => this.toggleBags());
    $('#social-fab').addEventListener('click', () => this.toggleSocial());
    $('#mm-arena').addEventListener('click', () => this.toggleArena());
    const musicBtn = $('#mm-music');
    const styleMusicBtn = () => { musicBtn.style.color = music.enabled ? '#ffd100' : '#666'; };
    styleMusicBtn();
    musicBtn.addEventListener('click', () => {
      music.setEnabled(!music.enabled);
      styleMusicBtn();
    });
    const startZone = zoneAt(sim.player.pos.z);
    this.lastZoneId = startZone.id;
    this.showBanner(startZone.name);
    this.log(t('hud.core.welcomeZone', { zone: startZone.name }), '#ffd100');
    this.logZoneWelcome(startZone);
  }

  private bindLogTabs(): void {
    const tabs = document.querySelectorAll<HTMLButtonElement>('.chat-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const which = tab.dataset.logTab;
        tabs.forEach((t) => t.classList.toggle('active', t === tab));
        $('#chatlog').classList.toggle('active', which === 'chat');
        $('#combatlog').classList.toggle('active', which === 'combat');
      });
    });
  }

  // -------------------------------------------------------------------------
  // Portraits, icons, tooltips, money
  // -------------------------------------------------------------------------

  private drawPortrait(canvas: HTMLCanvasElement, glyph: string, tint: number): void {
    const ctx = canvas.getContext('2d')!;
    const s = canvas.width;
    const g = ctx.createRadialGradient(s * 0.38, s * 0.32, 2, s / 2, s / 2, s * 0.62);
    const c = '#' + tint.toString(16).padStart(6, '0');
    g.addColorStop(0, shade(c, 0.45));
    g.addColorStop(1, shade(c, -0.65));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    ctx.font = `${Math.floor(s * 0.58)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, s / 2, s / 2 + 2);
  }

  private itemIcon(item: ItemDef): string {
    const q = item.quality ?? 'common';
    return `<img class="item-icon q-${q}" src="${iconDataUrl('item', item.id)}" alt="" draggable="false">`;
  }

  moneyHtml(copper: number): string {
    const parts = moneyParts(copper);
    const coin = (value: number, cls: 'g' | 's' | 'c', unitKey: TranslationKey): string =>
      `<span class="coin-part"><span class="coin-amount">${esc(formatNumber(value, { maximumFractionDigits: 0 }))}</span><span class="coin ${cls}" aria-hidden="true"></span><span class="visually-hidden">${esc(t(unitKey))}</span></span>`;
    let html = '';
    if (parts.gold > 0) html += coin(parts.gold, 'g', 'itemUi.money.gold');
    if (parts.silver > 0 || parts.gold > 0) html += coin(parts.silver, 's', 'itemUi.money.silver');
    html += coin(parts.copper, 'c', 'itemUi.money.copper');
    return `<span class="money-inline" aria-label="${esc(formatLocalizedMoney(copper, 'long'))}">${html}</span>`;
  }

  attachTooltip(el: HTMLElement, html: () => string): void {
    let touchTimer: number | undefined;
    const mobile = () => document.body.classList.contains('mobile-touch');
    const clearTouchTimer = () => {
      if (touchTimer !== undefined) window.clearTimeout(touchTimer);
      touchTimer = undefined;
    };
    const showAt = (x: number, y: number) => {
      this.tooltipEl.innerHTML = html();
      this.tooltipEl.style.display = 'block';
      const tw = this.tooltipEl.offsetWidth, th = this.tooltipEl.offsetHeight;
      this.tooltipEl.style.left = `${Math.max(8, Math.min(window.innerWidth - tw - 8, x + 14))}px`;
      this.tooltipEl.style.top = `${Math.max(8, y - th - 10)}px`;
    };
    const showNearElement = () => {
      const rect = el.getBoundingClientRect();
      showAt(rect.right, rect.top + rect.height / 2);
    };
    el.addEventListener('mouseenter', () => {
      if (mobile()) return;
      showNearElement();
    });
    el.addEventListener('mousemove', (e) => {
      if (mobile()) return;
      const tw = this.tooltipEl.offsetWidth, th = this.tooltipEl.offsetHeight;
      this.tooltipEl.style.left = `${Math.min(window.innerWidth - tw - 8, e.clientX + 14)}px`;
      this.tooltipEl.style.top = `${Math.max(8, e.clientY - th - 10)}px`;
    });
    el.addEventListener('mouseleave', () => { clearTouchTimer(); this.tooltipEl.style.display = 'none'; });
    el.addEventListener('focusin', showNearElement);
    el.addEventListener('focusout', () => { clearTouchTimer(); this.tooltipEl.style.display = 'none'; });
    el.addEventListener('pointerdown', (e) => {
      if (!mobile() || e.pointerType === 'mouse') return;
      clearTouchTimer();
      const x = e.clientX, y = e.clientY;
      touchTimer = window.setTimeout(() => showAt(x, y), 950);
    });
    el.addEventListener('pointerup', clearTouchTimer);
    el.addEventListener('pointercancel', clearTouchTimer);
  }

  hideTooltip(): void {
    this.tooltipEl.style.display = 'none';
  }

  private itemTooltip(item: ItemDef): string {
    const qColor = QUALITY_COLOR[item.quality ?? 'common'] ?? '#fff';
    let html = `<div class="tt-title" style="color:${qColor}">${esc(item.name)}</div>`;
    html += `<div class="tt-sub">${esc(t('itemUi.tooltip.qualityKind', {
      quality: itemQualityLabel(item.quality),
      kind: itemKindLabel(item.kind),
    }))}</div>`;
    if (item.slot) {
      html += `<div class="tt-sub">${esc(itemSlotName(item.slot))}</div>`;
    }
    if (item.weapon) {
      const dps = (item.weapon.min + item.weapon.max) / 2 / item.weapon.speed;
      html += `<div class="tt-stat">${esc(t('itemUi.tooltip.damageSpeed', {
        min: itemNumber(item.weapon.min),
        max: itemNumber(item.weapon.max),
        speed: itemNumber(item.weapon.speed, 1),
      }))}</div>`;
      html += `<div class="tt-stat">${esc(t('itemUi.tooltip.dps', { dps: itemNumber(dps, 1) }))}</div>`;
      if (item.weapon.dagger) html += `<div class="tt-sub">${esc(t('itemUi.tooltip.dagger'))}</div>`;
    }
    if (item.stats) {
      for (const [k, v] of Object.entries(item.stats)) {
        if (v === undefined) continue;
        if (k === 'armor') {
          html += `<div class="tt-stat">${esc(t('itemUi.tooltip.armorStat', { value: itemNumber(v) }))}</div>`;
        } else {
          html += `<div class="tt-green">${esc(t('itemUi.tooltip.stat', {
            value: itemNumber(v),
            stat: itemStatName(k),
          }))}</div>`;
        }
      }
    }
    if (item.foodHp) html += `<div class="tt-desc">${esc(t('itemUi.tooltip.useFood', { amount: itemNumber(item.foodHp), seconds: itemNumber(CONSUME_DURATION) }))}</div>`;
    if (item.drinkMana) html += `<div class="tt-desc">${esc(t('itemUi.tooltip.useDrink', { amount: itemNumber(item.drinkMana), seconds: itemNumber(CONSUME_DURATION) }))}</div>`;
    if (item.kind === 'quest') html += `<div class="tt-desc">${esc(t('itemUi.tooltip.questItem'))}</div>`;
    if (item.requiredClass) {
      html += `<div class="tt-sub">${esc(t('itemUi.tooltip.classes', { classes: item.requiredClass.map(classDisplayName).join(', ') }))}</div>`;
    }
    if (item.sellValue > 0) html += `<div class="tt-sub">${esc(t('itemUi.tooltip.sellPrice', { money: formatLocalizedMoney(item.sellValue) }))}</div>`;
    return html;
  }

  private questNumber(value: number): string {
    return formatNumber(value, { maximumFractionDigits: 0 });
  }

  private questProgressText(label: string, current: number, total: number): string {
    return t('questUi.detail.objectiveProgress', {
      label,
      current: this.questNumber(current),
      total: this.questNumber(total),
    });
  }

  private questSuggestedPlayersHtml(count?: number): string {
    if (!count) return '';
    return ` <span class="quest-suggested">${esc(t('questUi.log.suggestedPlayers', { count: this.questNumber(count) }))}</span>`;
  }

  private canRestoreFocusTo(target: HTMLElement | null): target is HTMLElement {
    return Boolean(target?.isConnected && target.getClientRects().length > 0);
  }

  private currentFocusableElement(): HTMLElement | null {
    const active = document.activeElement;
    return active instanceof HTMLElement && active !== document.body && this.canRestoreFocusTo(active) ? active : null;
  }

  private restoreFocus(target: HTMLElement | null, fallback?: HTMLElement | null): void {
    const candidate = this.canRestoreFocusTo(target) ? target : this.canRestoreFocusTo(fallback ?? null) ? fallback! : null;
    if (!candidate) return;
    window.setTimeout(() => candidate.focus(), 0);
  }

  private focusFirstInteractive(root: HTMLElement, preferredSelector?: string): void {
    window.setTimeout(() => {
      const target = (preferredSelector ? root.querySelector<HTMLElement>(preferredSelector) : null)
        ?? root.querySelector<HTMLElement>('button:not([disabled]):not([data-close]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
        ?? root.querySelector<HTMLElement>('button:not([disabled])');
      (target ?? root).focus();
    }, 0);
  }

  private refreshLocalizedDynamicUi(): void {
    this.updateQuestTracker();
    const log = $('#quest-log-window');
    if (log.style.display === 'block') this.renderQuestLog();
    if ($('#bags').style.display === 'block') this.renderBags();
    if (this.openVendorNpcId !== null && $('#vendor-window').style.display === 'block') this.renderVendor();
    if (this.marketOpen) {
      this.lastMarketSig = '';
      this.renderMarket();
    }
    if ($('#char-window').style.display === 'block') this.renderChar();
    const dialog = $('#quest-dialog');
    if (dialog.style.display !== 'block' || this.openGossipNpcId === null) return;
    const npc = this.sim.entities.get(this.openGossipNpcId);
    if (!npc) {
      this.closeQuestDialog();
      return;
    }
    if (this.openQuestDetailId && QUESTS[this.openQuestDetailId]) {
      this.renderQuestDetail(npc, this.openQuestDetailId);
    } else {
      this.renderGossip(npc);
    }
  }

  private abilityTooltip(res: ResolvedAbility): string {
    const a = res.def;
    const damageText = abilityEffectText(res.effects);
    let html = `<div class="tt-title">${esc(abilityDisplayName(a))}</div>`;
    html += `<div class="tt-sub">${esc(t('abilityUi.tooltip.rank', { rank: formatAbilityNumber(res.rank) }))}</div>`;
    const costLine: string[] = [];
    if (res.cost > 0) {
      costLine.push(t('abilityUi.tooltip.cost', {
        cost: formatAbilityNumber(res.cost),
        resource: resourceDisplayName(this.sim.player.resourceType),
      }));
    }
    const rangeLine = abilityRangeLine(a);
    if (rangeLine) costLine.push(rangeLine);
    if (costLine.length) html += `<div class="tt-stat">${costLine.map(esc).join(' &nbsp; ')}</div>`;
    const castLine = [abilityCastLine(res)];
    if (a.cooldown > 0) castLine.push(t('abilityUi.tooltip.cooldownSeconds', { seconds: formatAbilityNumber(a.cooldown) }));
    html += `<div class="tt-stat">${castLine.map(esc).join(' &nbsp; ')}</div>`;
    html += `<div class="tt-desc">${esc(abilityDisplayDescription(a, damageText))}</div>`;
    const requirements = abilityRequirementLines(a);
    if (requirements.length) {
      html += requirements.map((line) => `<div class="tt-sub">${esc(line)}</div>`).join('');
    }
    return html;
  }

  // -------------------------------------------------------------------------
  // Action bar
  // -------------------------------------------------------------------------

  // The hotbar layout is a client-side remap over the learned abilities,
  // keyed by ability id (known is class-ordered and shifts on level-up, so
  // indices would not survive). Persisted per class+character.
  private slotMapKey(): string {
    return `woc_hotbar_${this.sim.cfg.playerClass}_${this.sim.player.name}`;
  }

  private loadSlotMap(): void {
    let arr: unknown = null;
    try { arr = JSON.parse(localStorage.getItem(this.slotMapKey()) ?? 'null'); } catch { /* corrupt */ }
    const seen = new Set<string>();
    this.slotMap = Array.from({ length: Hud.BAR_ABILITY_SLOTS }, (_, i) => {
      const v = Array.isArray(arr) ? arr[i] : null;
      if (typeof v !== 'string' || !ABILITIES[v] || seen.has(v)) return null;
      seen.add(v);
      return v;
    });
  }

  private saveSlotMap(): void {
    try { localStorage.setItem(this.slotMapKey(), JSON.stringify(this.slotMap)); } catch { /* storage unavailable */ }
  }

  // Drop unlearned ids; place newly learned abilities in the first empty
  // slot. With empty storage this reproduces the default class-order layout.
  private syncSlotMap(): void {
    const ids = new Set(this.sim.known.map((k) => k.def.id));
    let dirty = false;
    for (let i = 0; i < this.slotMap.length; i++) {
      const id = this.slotMap[i];
      if (id !== null && !ids.has(id)) { this.slotMap[i] = null; dirty = true; }
    }
    for (const k of this.sim.known) {
      if (this.slotMap.includes(k.def.id)) continue;
      const empty = this.slotMap.indexOf(null);
      if (empty !== -1) { this.slotMap[empty] = k.def.id; dirty = true; }
    }
    if (dirty) this.saveSlotMap();
  }

  abilityForSlot(barSlot: number): ResolvedAbility | null { // barSlot 1..11
    const id = this.slotMap[barSlot - 1];
    return id ? this.sim.known.find((k) => k.def.id === id) ?? null : null;
  }

  // Shared entry point for hotbar clicks and the 1..0-= keybinds.
  castSlot(barSlot: number): void {
    if (barSlot === 0) {
      if (this.sim.player.autoAttack) this.sim.stopAutoAttack();
      else this.sim.startAutoAttack();
      return;
    }
    const known = this.abilityForSlot(barSlot);
    // cast by ability id: the server validates against its own known list,
    // so the client-side slot remap never desyncs slot semantics
    if (known) this.sim.castAbility(known.def.id);
  }

  private buildActionBar(): void {
    const bar = $('#actionbar');
    for (let i = 0; i < 12; i++) {
      const btn = document.createElement('button');
      btn.className = 'action-btn empty';
      const label = document.createElement('span');
      label.className = 'icon-label';
      const kb = document.createElement('span');
      kb.className = 'keybind';
      kb.textContent = this.keybinds.primaryLabel(`slot${i}`); // rebindable; refreshKeybindLabels keeps it current
      const cdOverlay = document.createElement('div');
      cdOverlay.className = 'cd-overlay';
      const cdText = document.createElement('div');
      cdText.className = 'cdtext';
      btn.append(label, kb, cdOverlay, cdText);
      const slot = i;
      // slot 0 is Attack for every class (auto-attack toggle — players
      // without right-click need a way in); the kit fills slots 1+
      btn.addEventListener('click', () => {
        audio.click();
        this.castSlot(slot);
      });
      this.attachTooltip(btn, () => {
        if (slot === 0) {
          return `<div class="tt-title">${esc(t('abilityUi.actionBar.attackName'))}</div><div class="tt-sub">${esc(t('abilityUi.actionBar.attackTooltip'))}</div>`;
        }
        const known = this.abilityForSlot(slot);
        return known ? this.abilityTooltip(known) : `<div class="tt-sub">${esc(t('abilityUi.actionBar.emptySlot'))}</div>`;
      });
      if (slot >= 1) {
        // drag an ability onto another slot to swap the two keybinds;
        // slot 0 (Attack) stays fixed
        btn.draggable = true;
        btn.addEventListener('dragstart', (e) => {
          const known = this.abilityForSlot(slot);
          if (!known) { e.preventDefault(); return; }
          this.dragFromSlot = slot;
          e.dataTransfer!.setData('text/plain', known.def.id);
          e.dataTransfer!.effectAllowed = 'move';
          this.hideTooltip();
        });
        btn.addEventListener('dragover', (e) => {
          if (this.dragFromSlot === null || this.dragFromSlot === slot) return;
          e.preventDefault(); // required to permit the drop
          e.dataTransfer!.dropEffect = 'move';
          btn.classList.add('drop-target');
        });
        btn.addEventListener('dragleave', () => btn.classList.remove('drop-target'));
        btn.addEventListener('drop', (e) => {
          e.preventDefault();
          btn.classList.remove('drop-target');
          const from = this.dragFromSlot;
          this.dragFromSlot = null;
          if (from === null || from === slot) return;
          const a = from - 1, b = slot - 1;
          [this.slotMap[a], this.slotMap[b]] = [this.slotMap[b], this.slotMap[a]]; // swap; empty target = move
          this.saveSlotMap();
        });
        btn.addEventListener('dragend', () => {
          this.dragFromSlot = null;
          bar.querySelectorAll('.drop-target').forEach((el) => el.classList.remove('drop-target'));
        });
      }
      bar.appendChild(btn);
      this.abilityButtons.push({ btn, label, keybindEl: kb, cdOverlay, cdText, lastIcon: '' });
    }
  }

  // Repaint the keycap on every action button from the current bindings.
  private refreshKeybindLabels(): void {
    for (let i = 0; i < this.abilityButtons.length; i++) {
      this.abilityButtons[i].keybindEl.textContent = this.keybinds.primaryLabel(`slot${i}`);
    }
  }

  private buildXpTicks(): void {
    const ticks = $('#xpbar .ticks');
    for (let i = 0; i < 20; i++) ticks.appendChild(document.createElement('i'));
  }

  // -------------------------------------------------------------------------
  // Frame update
  // -------------------------------------------------------------------------

  update(): void {
    const sim = this.sim;
    const p = sim.player;
    this.meters.update();
    this.syncSlotMap(); // picks up newly learned abilities mid-session

    // player frame
    $('#pf-level').textContent = String(p.level);
    ($('#pf-hp') as HTMLElement).style.transform = `scaleX(${p.hp / Math.max(1, p.maxHp)})`;
    $('#pf-hp-text').textContent = `${p.hp} / ${p.maxHp}`;
    const resFrac = p.resource / Math.max(1, p.maxResource);
    ($('#pf-res') as HTMLElement).style.transform = `scaleX(${resFrac})`;
    $('#pf-res-text').textContent = `${Math.round(p.resource)} / ${p.maxResource}`;
    $('#pf-resource').className = 'bar ' + (p.resourceType === 'rage' ? 'rage' : p.resourceType === 'energy' ? 'energy' : 'mana');

    // buff bar (player buffs + debuffs)
    this.renderAuras($('#buff-bar'), p, 'all');

    // target frame
    const target = p.targetId !== null ? sim.entities.get(p.targetId) : null;
    const tf = $('#target-frame');
    if (target && target.kind !== 'object') {
      tf.style.display = 'flex';
      tf.classList.toggle('elite', !!MOBS[target.templateId]?.elite);
      $('#tf-elite-tag').textContent = MOBS[target.templateId]?.boss ? t('hud.core.boss') : t('hud.core.elite');
      $('#tf-name').textContent = target.name;
      $('#tf-level').textContent = MOBS[target.templateId]?.boss ? '☠' : String(target.level);
      ($('#tf-hp') as HTMLElement).style.transform = `scaleX(${target.hp / Math.max(1, target.maxHp)})`;
      $('#tf-hp-text').textContent = target.dead ? t('hud.core.dead') : `${target.hp} / ${target.maxHp}`;
      ($('#tf-name') as HTMLElement).style.color = target.hostile ? '#ff6b5e' : '#9fdc7f';
      if (this.lastPortraitTarget !== target.id) {
        this.lastPortraitTarget = target.id;
        const glyph = target.kind === 'npc' ? '💬' : FAMILY_GLYPH[MOBS[target.templateId]?.family ?? 'humanoid'] ?? '🗡️';
        this.drawPortrait($('#tf-portrait') as unknown as HTMLCanvasElement, glyph, target.color);
      }
      this.renderAuras($('#tf-debuffs'), target, 'debuffs');
      // combo points
      const comboRow = $('#combo-row');
      if (p.resourceType === 'energy') {
        comboRow.style.display = 'flex';
        if (comboRow.children.length !== 5) {
          comboRow.innerHTML = '';
          for (let i = 0; i < 5; i++) {
            const pip = document.createElement('div');
            pip.className = 'combo-pip';
            comboRow.appendChild(pip);
          }
        }
        const points = p.comboTargetId === target.id ? p.comboPoints : 0;
        [...comboRow.children].forEach((pip, i) => pip.classList.toggle('on', i < points));
      } else {
        comboRow.style.display = 'none';
      }
    } else {
      tf.style.display = 'none';
      this.lastPortraitTarget = -999;
    }

    // cast bar
    const cb = $('#castbar');
    if (p.castingAbility) {
      cb.style.display = 'block';
      cb.classList.toggle('channel', p.channeling);
      const frac = p.channeling
        ? p.castRemaining / Math.max(0.01, p.castTotal)
        : 1 - p.castRemaining / Math.max(0.01, p.castTotal);
      (cb.querySelector('.fill') as HTMLElement).style.width = `${(frac * 100).toFixed(1)}%`;
      (cb.querySelector('.label') as HTMLElement).textContent = abilityDisplayName(ABILITIES[p.castingAbility]);
    } else if (p.eating || p.drinking) {
      cb.style.display = 'block';
      cb.classList.add('channel');
      const c = p.eating && p.drinking
        ? (p.eating.remaining >= p.drinking.remaining ? p.eating : p.drinking)
        : (p.eating ?? p.drinking)!;
      (cb.querySelector('.fill') as HTMLElement).style.width = `${((c.remaining / CONSUME_DURATION) * 100).toFixed(1)}%`;
      (cb.querySelector('.label') as HTMLElement).textContent =
        p.eating && p.drinking ? t('hud.core.eatingDrinking') : p.eating ? t('hud.core.eating') : t('hud.core.drinking');
    } else {
      cb.style.display = 'none';
      cb.classList.remove('channel');
      (cb.querySelector('.fill') as HTMLElement).style.width = '0%';
      (cb.querySelector('.label') as HTMLElement).textContent = '';
    }

    // action bar
    const tgtDist = target && !target.dead ? dist2d(p.pos, target.pos) : null;
    const actionbar = $('#actionbar');
    actionbar.classList.toggle('many-spells', this.slotMap.filter((id) => id !== null).length > 10);
    for (let i = 0; i < this.abilityButtons.length; i++) {
      const ab = this.abilityButtons[i];
      const slotLabel = formatAbilityNumber(i + 1);
      if (i === 0) {
        // Attack button: glows while auto-attacking, red-edged out of range
        ab.btn.classList.remove('empty', 'unusable');
        ab.btn.setAttribute('aria-label', t('abilityUi.actionBar.slotAria', {
          slot: slotLabel,
          ability: t('abilityUi.actionBar.attackName'),
        }));
        if (ab.lastIcon !== '__attack') {
          ab.lastIcon = '__attack';
          ab.label.style.backgroundImage = `url(${iconDataUrl('ability', 'attack')})`;
        }
        ab.cdOverlay.style.height = '0%';
        ab.cdText.textContent = '';
        ab.btn.classList.toggle('queued', !!p.autoAttack);
        ab.btn.classList.toggle('oor', tgtDist !== null && tgtDist > MELEE_RANGE);
        continue;
      }
      const known = this.abilityForSlot(i);
      if (!known) {
        ab.btn.classList.add('empty');
        ab.btn.setAttribute('aria-label', t('abilityUi.actionBar.emptySlotAria', { slot: slotLabel }));
        if (ab.lastIcon !== '') {
          ab.lastIcon = '';
          ab.label.style.backgroundImage = '';
        }
        ab.cdOverlay.style.height = '0%';
        ab.cdText.textContent = '';
        continue;
      }
      const a = known.def;
      ab.btn.classList.remove('empty');
      ab.btn.setAttribute('aria-label', t('abilityUi.actionBar.slotAria', {
        slot: slotLabel,
        ability: abilityDisplayName(a),
      }));
      // set the painted icon once per slot change, not every frame
      if (ab.lastIcon !== a.id) {
        ab.lastIcon = a.id;
        ab.label.style.backgroundImage = `url(${iconDataUrl('ability', a.id)})`;
      }
      const cd = p.cooldowns.get(a.id) ?? 0;
      const gcdActive = !a.offGcd && p.gcdRemaining > 0;
      const shown = Math.max(cd, gcdActive ? p.gcdRemaining : 0);
      const denom = cd > 0 ? a.cooldown : GCD;
      ab.cdOverlay.style.height = shown > 0 ? `${Math.min(100, (shown / Math.max(0.01, denom)) * 100)}%` : '0%';
      ab.cdText.textContent = cd > 1 ? Math.ceil(cd).toString() : '';
      ab.btn.classList.toggle('unusable', p.resource < known.cost);
      const oor = a.requiresTarget && tgtDist !== null && tgtDist > (a.range > 0 ? a.range : MELEE_RANGE);
      ab.btn.classList.toggle('oor', !!oor);
      ab.btn.classList.toggle('queued', p.queuedOnSwing === a.id);
    }

    // xp bar
    const xpNeed = xpForLevel(p.level);
    const xpFrac = p.level >= MAX_LEVEL ? 1 : sim.xp / xpNeed;
    ($('#xpbar .fill') as HTMLElement).style.width = `${(xpFrac * 100).toFixed(1)}%`;
    $('#xpbar .label').textContent = p.level >= MAX_LEVEL
      ? t('hud.core.maxLevel')
      : t('hud.core.xpProgress', { current: sim.xp, needed: xpNeed, percent: Math.floor(xpFrac * 100) });

    $('#death-overlay').style.display = p.dead ? 'flex' : 'none';

    // zone transitions: banner + welcome hint when crossing into a new band.
    // A ~5yd dead-band past the boundary stops a player straddling the border
    // from re-triggering the banner/log (and the map canvas regen) every step.
    const inDungeon = p.pos.x > DUNGEON_X_THRESHOLD;
    const currentZone = zoneAt(p.pos.z);
    if (!inDungeon && currentZone.id !== this.lastZoneId) {
      const lastZone = ZONES.find((z) => z.id === this.lastZoneId);
      const pastDeadBand = !lastZone
        || p.pos.z < lastZone.zMin - ZONE_BANNER_DEADBAND
        || p.pos.z >= lastZone.zMax + ZONE_BANNER_DEADBAND;
      if (pastDeadBand) {
        if (this.lastZoneId !== '') {
          this.showBanner(currentZone.name);
          this.log(t('hud.core.enteringZone', { zone: currentZone.name }), '#ffd100');
          this.logZoneWelcome(currentZone);
        }
        this.lastZoneId = currentZone.id;
      }
    }

    // soundtrack: pick the zone theme and layer in combat percussion.
    // Combat = a mob is on us, or we traded blows in the last few seconds
    // (the wire protocol doesn't ship the inCombat flag).
    let aggroed = false;
    for (const e of sim.entities.values()) {
      if (e.kind === 'mob' && !e.dead && e.aggroTargetId === sim.playerId) { aggroed = true; break; }
    }
    const inCombat = aggroed || performance.now() - this.lastCombatEventAt < 5000;
    const hub = currentZone.hub;
    const zone = inDungeon ? 'dungeon'
      : Math.hypot(p.pos.x - hub.x, p.pos.z - hub.z) < hub.radius + 10 ? 'town' : currentZone.biome;
    music.update(zone, inCombat);

    this.updateQuestTracker();
    this.updatePartyFrames();
    this.updateTradeWindow();
    this.updateArenaStatus();
    this.updateMinimap();
    if ($('#map-window').style.display === 'block') this.updateMapWindow();
    if ($('#social-window').classList.contains('open')) {
      const struct = this.socialStructSig();
      if (struct !== this.lastSocialStruct) {
        this.lastSocialStruct = struct;
        this.lastSocialContent = JSON.stringify(this.sim.socialInfo);
        this.renderSocial();
      } else {
        const content = JSON.stringify(this.sim.socialInfo);
        if (content !== this.lastSocialContent) { this.lastSocialContent = content; this.refreshSocialList(); }
      }
    }
    if ($('#arena-window').style.display === 'block') this.renderArenaWindow();
    if (this.openLootMobId !== null) {
      const mob = sim.entities.get(this.openLootMobId);
      if (!mob || !mob.lootable || dist2d(p.pos, mob.pos) > 7) this.closeLoot();
    }
    if (this.openVendorNpcId !== null) {
      const npc = sim.entities.get(this.openVendorNpcId);
      if (!npc || dist2d(p.pos, npc.pos) > 8) this.closeVendor();
    }
    if (this.marketOpen) {
      if (!this.nearbyMarketNpc()) this.closeMarket();
      else this.refreshMarket();
    }
  }

  private renderAuras(el: HTMLElement, e: Entity, mode: 'all' | 'debuffs'): void {
    // cheap diff: rebuild only when the aura set changes
    const sig = e.auras.map((a) => a.id + Math.ceil(a.remaining)).join('|');
    if ((el as any).__sig === sig) return;
    (el as any).__sig = sig;
    el.innerHTML = '';
    for (const a of e.auras) {
      const isDebuff = ['dot', 'slow', 'root', 'stun', 'incapacitate', 'polymorph', 'attackspeed'].includes(a.kind);
      if (mode === 'debuffs' && !isDebuff) continue;
      const d = document.createElement('div');
      d.className = 'buff' + (isDebuff ? ' debuff' : '');
      d.style.backgroundImage = `url(${iconDataUrl('aura', ABILITIES[a.id] ? a.id : `aura_${a.kind}`)})`;
      const dur = document.createElement('div');
      dur.className = 'dur';
      dur.textContent = a.remaining < 99 ? `${Math.ceil(a.remaining)}s` : '';
      d.appendChild(dur);
      this.attachTooltip(d, () => `<div class="tt-title">${a.name}</div><div class="tt-sub">${t('hud.core.secondsRemaining', { seconds: Math.ceil(a.remaining) })}</div>`);
      el.appendChild(d);
    }
  }

  private updateQuestTracker(): void {
    const el = $('#quest-tracker');
    let html = this.sim.questLog.size > 0 ? `<div class="qt-header">${esc(t('questUi.tracker.title'))}</div>` : '';
    for (const qp of this.sim.questLog.values()) {
      const quest = QUESTS[qp.questId];
      html += `<div class="qt-title">${esc(quest.name)}${qp.state === 'ready' ? ` <span class="quest-complete">(${esc(t('questUi.tracker.complete'))})</span>` : ''}</div>`;
      quest.objectives.forEach((obj, i) => {
        const done = qp.counts[i] >= obj.count;
        html += `<div class="qt-obj${done ? ' done' : ''}">- ${esc(this.questProgressText(obj.label, qp.counts[i], obj.count))}</div>`;
      });
    }
    if (el.innerHTML !== html) el.innerHTML = html;
  }

  // -------------------------------------------------------------------------
  // Minimap & world map
  // -------------------------------------------------------------------------

  // Render a region of the heightfield to a canvas; width W px, height
  // derived from the region's aspect so a yard is square on screen.
  private renderTerrainCanvas(W: number, region: { minX: number; maxX: number; minZ: number; maxZ: number }): HTMLCanvasElement {
    const spanX = region.maxX - region.minX;
    const spanZ = region.maxZ - region.minZ;
    const H = Math.round(W * spanZ / spanX);
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(W, H);
    const seed = this.sim.cfg.seed;
    for (let iy = 0; iy < H; iy++) {
      for (let ix = 0; ix < W; ix++) {
        // +Z up, +X LEFT: facing 0 is +Z ("north") and turning right
        // decreases facing, so the world's east is -X — drawing +X to the
        // right mirrored the whole map east-west
        const x = region.maxX - (ix / W) * spanX;
        const z = region.maxZ - (iy / H) * spanZ;
        const h = terrainHeight(x, z, seed);
        const biome = zoneAt(z).biome;
        let r = 58, g = 105, b = 48;
        if (biome === 'marsh') { r = 64; g = 86; b = 48; }
        else if (biome === 'peaks') { r = 92; g = 100; b = 82; }
        if (h < WATER_LEVEL) { r = 38; g = 84; b = 138; }
        else if (h > 26) { r = 168; g = 172; b = 178; } // ridge / peak rock+snow
        else if (h > 11) { r = 112; g = 110; b = 102; }
        else if (h > 6) { r = 88; g = 102; b = 62; }
        let nearHub = false;
        for (const zn of ZONES) {
          if (Math.hypot(x - zn.hub.x, z - zn.hub.z) < 14) { nearHub = true; break; }
        }
        if (nearHub) { r = 125; g = 100; b = 66; }
        else if (h >= WATER_LEVEL && roadDistance(x, z) < 2.4) { r = 138; g = 111; b = 71; }
        const k = (iy * W + ix) * 4;
        img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  private updateMinimap(): void {
    const ctx = this.minimapCtx;
    const S = 162;
    const p = this.sim.player;
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    const pxPerYard = 1.7;
    const bg = this.minimapBg;
    const bgPxPerYard = bg.width / (WORLD_MAX_X - WORLD_MIN_X);
    const sw = S / (pxPerYard / bgPxPerYard);
    const sx = (WORLD_MAX_X - p.pos.x) * bgPxPerYard - sw / 2; // bg is +X-left
    const sy = (WORLD_MAX_Z - p.pos.z) * bgPxPerYard - sw / 2;
    ctx.drawImage(bg, sx, sy, sw, sw, 0, 0, S, S);

    for (const e of this.sim.entities.values()) {
      if (e.id === p.id) continue;
      const dx = -(e.pos.x - p.pos.x) * pxPerYard; // +X is map-left
      const dz = -(e.pos.z - p.pos.z) * pxPerYard;
      const mx = S / 2 + dx, my = S / 2 + dz;
      if ((mx - S / 2) ** 2 + (my - S / 2) ** 2 > (S / 2 - 7) ** 2) continue;
      if (e.kind === 'npc') {
        const hasAvail = e.questIds.some((q) => QUESTS[q].giverNpcId === e.templateId && this.sim.questState(q) === 'available');
        const hasReady = e.questIds.some((q) => QUESTS[q].turnInNpcId === e.templateId && this.sim.questState(q) === 'ready');
        ctx.fillStyle = '#ffd100';
        ctx.font = 'bold 11px Georgia';
        ctx.fillText(hasReady ? '?' : hasAvail ? '!' : '•', mx - 2, my + 3);
      } else if (e.kind === 'object' && (e.templateId === 'dungeon_door' || e.templateId === 'dungeon_exit')) {
        ctx.fillStyle = '#c084ff';
        ctx.beginPath();
        ctx.arc(mx, my, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.kind === 'object' && e.lootable) {
        ctx.fillStyle = '#ffe97a';
        ctx.fillRect(mx - 1.5, my - 1.5, 3, 3);
      } else if (e.kind === 'mob' && !e.dead) {
        ctx.fillStyle = e.aggroTargetId === p.id ? '#ff8800' : '#e74c3c';
        ctx.fillRect(mx - 1.5, my - 1.5, 3, 3);
      } else if (e.kind === 'mob' && e.lootable) {
        ctx.fillStyle = '#ffd100';
        ctx.fillRect(mx - 1.5, my - 1.5, 3, 3);
      }
    }
    // Party members: class-colored markers. On-map allies are discs that
    // scale up the closer they are (proximity scaling); allies past the rim
    // are pinned to the edge as arrows pointing the way to regroup.
    const party = this.sim.partyInfo;
    if (party) {
      const R = S / 2 - 7;
      for (const m of party.members) {
        if (m.pid === p.id) continue;
        const dx = -(m.x - p.pos.x) * pxPerYard; // +X is map-left
        const dz = -(m.z - p.pos.z) * pxPerYard;
        const dist = Math.hypot(dx, dz);
        const offMap = dist > R;
        const ang = Math.atan2(dz, dx);
        const color = m.dead ? '#9a9a9a' : classCss(m.cls);
        ctx.save();
        if (offMap) {
          // edge-anchored arrow pointing outward toward the off-screen ally
          ctx.translate(S / 2 + Math.cos(ang) * R, S / 2 + Math.sin(ang) * R);
          ctx.rotate(ang);
          ctx.fillStyle = color;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(6, 0); ctx.lineTo(-4, 4.5); ctx.lineTo(-4, -4.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          // proximity scaling: ~6px adjacent down to ~3px near the rim
          const r = 6 - (dist / R) * 3;
          ctx.translate(S / 2 + dx, S / 2 + dz);
          ctx.fillStyle = color;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          if (!m.dead) { // bright inner pip so members pop against terrain
            ctx.fillStyle = '#ffffffcc';
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(1, r * 0.35), 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }
    }
    ctx.translate(S / 2, S / 2);
    ctx.rotate(-p.facing); // canvas rotates clockwise; facing increases turning left
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(4.5, 5.5); ctx.lineTo(-4.5, 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  toggleMeters(): void {
    this.meters.toggle();
  }

  // -------------------------------------------------------------------------
  // The Ashen Coliseum — 1v1 arena panel + in-match banner
  // -------------------------------------------------------------------------

  toggleArena(): void {
    const el = $('#arena-window');
    if (el.style.display === 'block') { el.style.display = 'none'; return; }
    el.style.display = 'block';
    this.lastArenaSig = '';
    this.fetchArenaLeaderboard();
    this.renderArenaWindow();
  }

  // Best-effort all-time ladder pull. Throttled; silently no-ops offline (no
  // server) so the panel still shows the live online ladder either way.
  private fetchArenaLeaderboard(): void {
    const now = performance.now();
    if (now - this.arenaLbFetchedAt < 15000) return;
    this.arenaLbFetchedAt = now;
    fetch('/api/arena/leaderboard')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.leaders)) { this.arenaAllTime = d.leaders; this.lastArenaSig = ''; }
      })
      .catch(() => { /* offline or no server — live ladder only */ });
  }

  private renderArenaWindow(): void {
    const el = $('#arena-window');
    const a = this.sim.arenaInfo;
    if (!a) {
      // offline / not yet synced: arena is an online ranked feature
      el.innerHTML = `<div class="panel-title"><span>The Ashen Coliseum</span><span class="x-btn" data-close>✕</span></div>`
        + `<div class="arena-note">The Ashen Coliseum is a ranked 1v1 arena for the live world. Play online to enter the queue and climb the ladder.</div>`;
      el.querySelector('[data-close]')?.addEventListener('click', () => { el.style.display = 'none'; });
      return;
    }
    const inMatch = a.match !== null;
    const myPid = this.sim.playerId;
    const ladder = a.ladder.map((r, i) => {
      const me = r.pid === myPid;
      const cls = CLASSES[r.cls]?.name ?? r.cls;
      return `<div class="ladder-row${me ? ' me' : ''}"><span class="rank">${i + 1}</span>`
        + `<span class="lr-name" title="${r.name} — ${cls}">${r.name}</span>`
        + `<span class="lr-rating">${r.rating}</span>`
        + `<span class="lr-wl">${r.wins}-${r.losses}</span></div>`;
    }).join('') || `<div class="ladder-empty">No challengers ranked yet — be the first.</div>`;

    let action: string;
    if (inMatch) {
      action = `<div class="arena-queue-status">⚔ Match in progress vs ${a.match!.oppName}.</div>`;
    } else if (a.queued) {
      action = `<button class="btn leave" data-act="leave">Leave Queue</button>`
        + `<div class="arena-queue-status">Searching for an opponent… (${a.queueSize} in queue)</div>`;
    } else {
      action = `<button class="btn" data-act="queue">Enter the Queue</button>`
        + `<div class="arena-note">You will be matched with the nearest-rated challenger online, then teleported to the sands. Win to climb; first to yield (1 health) loses. You return exactly where you queued.</div>`;
    }

    this.fetchArenaLeaderboard();
    const allTime = (this.arenaAllTime ?? []).map((r, i) => {
      const me = r.name === this.sim.player.name;
      const cls = CLASSES[r.class as keyof typeof CLASSES]?.name ?? r.class;
      return `<div class="ladder-row${me ? ' me' : ''}"><span class="rank">${i + 1}</span>`
        + `<span class="lr-name" title="${r.name} — Lv ${r.level} ${cls}">${r.name}</span>`
        + `<span class="lr-rating">${r.rating}</span>`
        + `<span class="lr-wl">${r.wins}-${r.losses}</span></div>`;
    }).join('');
    const allTimeSection = this.arenaAllTime && this.arenaAllTime.length > 0
      ? `<div class="arena-sub">Ladder — All-Time</div>${allTime}`
      : '';

    const sig = JSON.stringify([a.rating, a.wins, a.losses, a.queued, a.queueSize, inMatch, a.ladder, this.arenaAllTime]);
    if (sig === this.lastArenaSig) return; // nothing changed; skip the DOM churn (and re-bind)
    this.lastArenaSig = sig;

    el.innerHTML = `<div class="panel-title"><span>The Ashen Coliseum <span style="color:#998d6a;font-size:11px">1v1 Ranked</span></span><span class="x-btn" data-close>✕</span></div>`
      + `<div class="arena-rank"><span class="rating">${a.rating}</span>`
      + `<span class="wl">Rating &middot; <b>${a.wins}</b> wins / <i>${a.losses}</i> losses</span></div>`
      + action
      + `<div class="arena-sub">Ladder — Online</div>`
      + ladder
      + allTimeSection;

    el.querySelector('[data-close]')?.addEventListener('click', () => { el.style.display = 'none'; });
    el.querySelector('[data-act="queue"]')?.addEventListener('click', () => { this.sim.arenaQueueJoin(); audio.click(); });
    el.querySelector('[data-act="leave"]')?.addEventListener('click', () => { this.sim.arenaQueueLeave(); audio.click(); });
  }

  // The pinned in-match banner: opponent name + countdown / live match timer.
  private updateArenaStatus(): void {
    const el = $('#arena-status');
    const a = this.sim.arenaInfo;
    const m = a?.match ?? null;
    if (!m) {
      if (el.style.display !== 'none') el.style.display = 'none';
      this.lastArenaStatusSig = '';
      return;
    }
    const label = m.state === 'countdown' ? 'Steel yourself…' : 'Fight to the yield!';
    const sig = `${m.oppName}|${m.state}`;
    if (sig !== this.lastArenaStatusSig) {
      this.lastArenaStatusSig = sig;
      const cls = CLASSES[m.oppClass]?.name ?? m.oppClass;
      el.innerHTML = `<div class="as-vs">⚔ VS <span class="opp">${m.oppName}</span> <span style="color:#b6ad8c;font-size:11px">Lv ${m.oppLevel} ${cls}</span></div>`
        + `<div class="as-timer">${label}</div>`;
      el.style.display = 'block';
    }
  }

  toggleMap(): void {
    const el = $('#map-window');
    if (el.style.display === 'block') { el.style.display = 'none'; return; }
    el.style.display = 'block';
    this.updateMapWindow();
  }

  // The map window shows the zone band the player is standing in (each band
  // is a square); POIs and dungeon portals come from the zone/dungeon data.
  private updateMapWindow(): void {
    const canvas = $('#map-canvas') as unknown as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const S = canvas.width;
    const p = this.sim.player;
    // inside an instance, show the zone the dungeon's door is in (dungeonAt
    // owns the instance x-band layout); outdoors, follow the committed zone
    // so border-straddling can't thrash the 280px canvas regen below
    const dungeon = dungeonAt(p.pos.x);
    const zone: ZoneDef = dungeon
      ? zoneAt(dungeon.doorPos.z)
      : ZONES.find((z) => z.id === this.lastZoneId) ?? zoneAt(p.pos.z);
    const region = { minX: WORLD_MIN_X, maxX: WORLD_MAX_X, minZ: zone.zMin, maxZ: zone.zMax };
    if (!this.mapBg || this.mapZoneId !== zone.id) {
      this.mapBg = this.renderTerrainCanvas(280, region);
      this.mapZoneId = zone.id;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.mapBg, 0, 0, S, S);
    const spanX = region.maxX - region.minX;
    const spanZ = region.maxZ - region.minZ;
    const toMap = (x: number, z: number) => ({
      mx: ((region.maxX - x) / spanX) * S, // +X is map-left (east = -X)
      my: ((region.maxZ - z) / spanZ) * S,
    });
    // zone title
    ctx.font = 'bold 16px Georgia';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#ffe9a0';
    ctx.strokeText(zone.name, S / 2, 20);
    ctx.fillText(zone.name, S / 2, 20);
    // labels
    ctx.font = 'bold 13px Georgia';
    const label = (x: number, z: number, text: string) => {
      const { mx, my } = toMap(x, z);
      ctx.strokeText(text, mx, my);
      ctx.fillText(text, mx, my);
    };
    for (const poi of zone.pois) label(poi.x, poi.z, poi.label);
    // dungeon entrance portals in this zone
    for (const dungeon of DUNGEON_LIST) {
      if (dungeon.doorPos.z < zone.zMin || dungeon.doorPos.z >= zone.zMax) continue;
      const { mx, my } = toMap(dungeon.doorPos.x, dungeon.doorPos.z);
      ctx.fillStyle = '#c084ff';
      ctx.beginPath();
      ctx.arc(mx, my, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e0c0ff';
      ctx.font = 'bold 12px Georgia';
      ctx.strokeText(dungeon.name, mx, my - 9);
      ctx.fillText(dungeon.name, mx, my - 9);
      ctx.font = 'bold 13px Georgia';
      ctx.fillStyle = '#ffe9a0';
    }
    // npcs
    for (const e of this.sim.entities.values()) {
      if (e.kind !== 'npc') continue;
      if (e.pos.z < zone.zMin || e.pos.z >= zone.zMax) continue;
      const { mx, my } = toMap(e.pos.x, e.pos.z);
      const hasAvail = e.questIds.some((q) => QUESTS[q].giverNpcId === e.templateId && this.sim.questState(q) === 'available');
      const hasReady = e.questIds.some((q) => QUESTS[q].turnInNpcId === e.templateId && this.sim.questState(q) === 'ready');
      if (hasAvail || hasReady) {
        ctx.fillStyle = '#ffd100';
        ctx.font = 'bold 15px Georgia';
        ctx.strokeText(hasReady ? '?' : '!', mx, my);
        ctx.fillText(hasReady ? '?' : '!', mx, my);
      }
    }
    // player
    if (p.pos.z >= zone.zMin && p.pos.z < zone.zMax && p.pos.x <= WORLD_MAX_X) {
      const { mx, my } = toMap(p.pos.x, p.pos.z);
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(-p.facing); // matches the flipped map (see toMap)
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // -------------------------------------------------------------------------
  // Events -> log, FCT, audio, banners
  // -------------------------------------------------------------------------

  handleEvents(events: SimEvent[]): void {
    const sim = this.sim;
    for (const ev of events) {
      // visual effects (swings, projectiles, glows) — for everyone nearby,
      // not just events involving this player
      this.renderer.handleEvent(ev);
      this.meters.onEvent(ev);
      switch (ev.type) {
        case 'damage': {
          const src = sim.entities.get(ev.sourceId);
          const tgt = sim.entities.get(ev.targetId);
          if (!tgt) break;
          const isPlayerSource = ev.sourceId === sim.playerId;
          const isPlayerTarget = ev.targetId === sim.playerId;
          if (isPlayerSource || isPlayerTarget) this.lastCombatEventAt = performance.now();
          if (ev.kind === 'miss' || ev.kind === 'dodge') {
            this.fct(tgt, ev.kind === 'miss' ? t('hud.combat.floatingMiss') : t('hud.combat.floatingDodge'), isPlayerTarget ? '#bbb' : '#fff', false);
            if (isPlayerSource) {
              this.combatLog(t(ev.kind === 'miss' ? 'hud.combat.miss' : 'hud.combat.dodged', {
                ability: ev.ability ?? t('hud.combat.attack'),
                target: tgt.name,
              }), '#ccc');
              audio.meleeMiss();
            }
            break;
          }
          if (isPlayerSource && !isPlayerTarget) {
            const color = ev.ability ? '#ffe97a' : '#fff';
            this.fct(tgt, `${ev.amount}${ev.crit ? '!' : ''}`, color, ev.crit);
            this.combatLog(t(ev.crit ? 'hud.combat.damageDoneCrit' : 'hud.combat.damageDone', {
              ability: ev.ability ?? t('hud.combat.attack'),
              target: tgt.name,
              amount: ev.amount,
            }), ev.ability ? '#ffe97a' : '#eee');
            if (ev.school === 'fire') audio.fire();
            else if (ev.school === 'frost') audio.frost();
            else if (ev.school === 'arcane') audio.arcane();
            else audio.meleeHit(ev.crit);
          } else if (isPlayerTarget) {
            this.fct(tgt, `-${ev.amount}`, '#ff5544', ev.crit);
            this.combatLog(t(ev.crit ? 'hud.combat.damageTakenCrit' : 'hud.combat.damageTaken', {
              source: src?.name ?? '?',
              amount: ev.amount,
            }), '#ff8877');
            audio.hitTaken();
          }
          break;
        }
        case 'heal': {
          if (ev.targetId === sim.playerId && ev.amount > 0) {
            this.fct(sim.player, `+${ev.amount}`, '#3ce63c', false);
          }
          break;
        }
        case 'death': {
          const e = sim.entities.get(ev.entityId);
          if (e && ev.entityId !== sim.playerId) this.combatLog(t('hud.combat.death', { name: e.name }), '#aaa');
          break;
        }
        case 'xp': {
          this.fct(sim.player, t('hud.core.xpFloat', { amount: ev.amount }), '#b974ff', false);
          this.log(t('hud.core.xpGain', { amount: ev.amount }), '#a980d8');
          break;
        }
        case 'levelup': {
          this.showBanner(t('hud.core.levelBanner', { level: ev.level }));
          this.log(t('hud.core.levelLog', { level: ev.level }), '#ffd100');
          audio.levelUp();
          break;
        }
        case 'learnAbility': break; // logged by sim
        case 'comboPoint': break;
        case 'loot': {
          this.log(this.localizeLootText(ev.text), '#7fdc4f');
          if (ev.text.includes('loot') || ev.text.includes('Sold')) audio.coin();
          else audio.lootItem();
          if ($('#bags').style.display === 'block') this.renderBags();
          break;
        }
        case 'vendor': {
          if ($('#bags').style.display === 'block') this.renderBags();
          if (this.openVendorNpcId !== null) this.renderVendor();
          break;
        }
        case 'error': this.showError(this.localizeErrorText(ev.text)); break;
        case 'questAccepted':
          audio.questAccept();
          this.refreshGossip();
          break;
        case 'questProgress': this.log(this.localizeQuestProgressText(ev.questId, ev.text), '#dcd29f'); break;
        case 'questReady': {
          const q = QUESTS[ev.questId];
          this.showBanner(t('questUi.logs.ready', { name: q.name, status: t('questUi.log.readyStatus') }));
          audio.questDone();
          break;
        }
        case 'questDone':
          audio.questDone();
          this.refreshGossip();
          break;
        case 'chat': {
          if (this.isChatIgnored(ev.from)) break;
          switch (ev.channel) {
            case 'party': this.chatLogFrom(ev.from, ev.text, '#7fd4ff', CHAT_TEMPLATE_KEYS.party); break;
            case 'yell': this.chatLogFrom(ev.from, ev.text, '#ff5040', CHAT_TEMPLATE_KEYS.yell); break;
            case 'whisper':
              if (ev.to) this.chatLogFrom(ev.to, ev.text, '#ff80ff', CHAT_TEMPLATE_KEYS.toWhisper);
              else { this.chatLogFrom(ev.from, ev.text, '#ff80ff', CHAT_TEMPLATE_KEYS.whisper); audio.whisper(); }
              break;
            case 'general': this.chatLogFrom(ev.from, ev.text, '#ffc864', CHAT_TEMPLATE_KEYS.general); break;
            case 'guild': this.chatLogFrom(ev.from, ev.text, '#40d264', CHAT_TEMPLATE_KEYS.guild); break;
            case 'officer': this.chatLogFrom(ev.from, ev.text, '#4ce0c0', CHAT_TEMPLATE_KEYS.officer); break;
            default: this.chatLogFrom(ev.from, ev.text, '#f0ead8', CHAT_TEMPLATE_KEYS.say); break;
          }
          if ((ev.channel === 'say' || ev.channel === 'yell') && ev.entityId !== undefined) {
            this.renderer.showChatBubble(ev.entityId, ev.text, ev.channel === 'yell');
          }
          break;
        }
        case 'tradeDone':
          if ($('#bags').style.display === 'block') this.renderBags();
          audio.coin();
          break;
        case 'heal2': {
          const tgt = sim.entities.get(ev.targetId);
          if (tgt && ev.amount > 0) {
            this.fct(tgt, `+${ev.amount}${ev.crit ? '!' : ''}`, '#3ce63c', ev.crit);
            if (ev.sourceId === sim.playerId) {
              const selfTarget = ev.targetId === sim.playerId;
              this.combatLog(t(selfTarget
                ? (ev.crit ? 'hud.combat.healSelfCrit' : 'hud.combat.healSelf')
                : (ev.crit ? 'hud.combat.healOtherCrit' : 'hud.combat.healOther'), {
                ability: ev.ability,
                target: tgt.name,
                amount: ev.amount,
              }), '#7fdc4f');
            }
          }
          break;
        }
        case 'partyInvite':
          audio.questAccept();
          this.showPrompt(t('hud.prompts.partyInvite', { name: `<b>${esc(ev.fromName)}</b>` }), t('hud.prompts.joinParty'),
            () => this.sim.partyAccept(), () => this.sim.partyDecline());
          break;
        case 'guildInvite':
          audio.questAccept();
          this.showPrompt(t('hud.prompts.guildInvite', { name: `<b>${esc(ev.fromName)}</b>`, guild: `<span class="gold">&lt;${esc(ev.guildName)}&gt;</span>` }), t('hud.prompts.joinGuild'),
            () => this.sim.guildAccept(), () => this.sim.guildDecline());
          break;
        case 'tradeRequest':
          audio.click();
          this.showPrompt(t('hud.prompts.tradeRequest', { name: `<b>${esc(ev.fromName)}</b>` }), t('hud.prompts.openTrade'),
            () => this.sim.tradeAccept(), () => { /* let it expire */ });
          break;
        case 'duelRequest':
          audio.duelChallenge();
          this.showPrompt(t('hud.prompts.duelRequest', { name: `<b>${esc(ev.fromName)}</b>` }), t('hud.prompts.acceptDuel'),
            () => this.sim.duelAccept(), () => this.sim.duelDecline());
          break;
        case 'duelCountdown':
          this.showBanner(t('hud.system.duelCountdown', { seconds: ev.seconds }));
          audio.duelCountdownTick();
          break;
        case 'duelStart':
          audio.duelStart();
          break;
        case 'duelEnd':
          this.showBanner(t('hud.system.duelEndBanner', { winner: ev.winnerName, loser: ev.loserName }));
          this.combatLog(t('hud.system.duelEndLog', { winner: ev.winnerName, loser: ev.loserName }), '#fa6');
          audio.duelEnd();
          break;
        case 'arenaQueued':
          this.log(t('hud.system.arenaQueued', { position: ev.position }), '#ffa040');
          break;
        case 'arenaUnqueued':
          this.log(t('hud.system.arenaUnqueued'), '#ffa040');
          break;
        case 'arenaFound': {
          const cls = CLASSES[ev.oppClass]?.name ?? ev.oppClass;
          this.showBanner(t('hud.system.arenaFoundBanner', { name: ev.oppName }));
          this.log(t('hud.system.arenaFoundLog', { name: ev.oppName, level: ev.oppLevel, className: cls }), '#ffa040');
          audio.duelChallenge();
          break;
        }
        case 'arenaCountdown':
          this.showBanner(t('hud.system.arenaCountdown', { seconds: ev.seconds }));
          audio.duelCountdownTick();
          break;
        case 'arenaStart':
          this.showBanner(t('hud.system.arenaStart'));
          audio.duelStart();
          break;
        case 'arenaEnd': {
          const delta = ev.ratingAfter - ev.ratingBefore;
          const sign = delta >= 0 ? '+' : '';
          const ratingDelta = `${sign}${delta}`;
          if (ev.draw) {
            this.showBanner(t('hud.system.arenaDrawBanner', { name: ev.oppName, delta: ratingDelta }));
            this.combatLog(t('hud.system.arenaDrawLog', { name: ev.oppName, rating: ev.ratingAfter, delta: ratingDelta }), '#fa6');
          } else if (ev.won) {
            this.showBanner(t('hud.system.arenaVictoryBanner', { name: ev.oppName, rating: ev.ratingAfter, delta: ratingDelta }));
            this.combatLog(t('hud.system.arenaVictoryLog', { name: ev.oppName, rating: ev.ratingAfter, delta: ratingDelta }), '#7fdc4f');
            audio.duelEnd();
          } else {
            this.showBanner(t('hud.system.arenaDefeatBanner', { name: ev.oppName, rating: ev.ratingAfter, delta: ratingDelta }));
            this.combatLog(t('hud.system.arenaDefeatLog', { name: ev.oppName, rating: ev.ratingAfter, delta: ratingDelta }), '#ff7a6a');
            audio.death();
          }
          break;
        }
        case 'log': this.log(this.localizeSystemText(ev.text), ev.color ?? '#ccc'); break;
        case 'playerDeath': {
          this.log(t('hud.system.playerDeath'), '#ff4444');
          audio.death();
          break;
        }
        case 'respawn': this.log(t('hud.system.respawn'), '#7fdc4f'); break;
        case 'castStart': {
          const a = ABILITIES[ev.ability];
          if (a?.school === 'fire') audio.castStart();
          else if (a?.school === 'frost') audio.castStart();
          else audio.castStart();
          break;
        }
        case 'castStop': break;
        case 'aura': {
          const tgt = sim.entities.get(ev.targetId);
          if (ev.name === 'Polymorph' && ev.gained) audio.sheep();
          if (ev.targetId === sim.playerId) {
            this.combatLog(t(ev.gained ? 'hud.combat.auraGain' : 'hud.combat.auraFade', { name: ev.name }), '#d8a0d8');
          } else if (tgt && ev.gained) {
            this.combatLog(t('hud.combat.auraAfflicted', { target: tgt.name, name: ev.name }), '#d8a0d8');
          }
          break;
        }
      }
    }
  }

  log(text: string, color = '#ccc'): void {
    this.appendLog(this.chatLogEl, text, color);
  }

  private logZoneWelcome(zone: ZoneDef): void {
    const text = zoneWelcomeText(zone, (questId) => this.sim.questState(questId));
    if (text) this.log(text, '#ffd100');
  }

  private chatLogFrom(name: string, text: string, color: string, templateKey: TranslationKey): void {
    const wasNearBottom = this.chatLogEl.scrollHeight - this.chatLogEl.scrollTop - this.chatLogEl.clientHeight < 24;
    const div = document.createElement('div');
    div.style.color = color;
    const sender = document.createElement('span');
    sender.className = 'chat-player-name';
    sender.textContent = name;
    sender.title = t('hud.chat.rightClickName', { name });
    sender.setAttribute('role', 'button');
    sender.setAttribute('aria-label', t('hud.chat.rightClickName', { name }));
    sender.tabIndex = 0;
    sender.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      this.openChatPlayerContextMenu(name, ev.clientX, ev.clientY);
    });
    sender.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      const rect = sender.getBoundingClientRect();
      this.openChatPlayerContextMenu(name, rect.left, rect.bottom);
    });
    const nameToken = '__WOC_CHAT_NAME__';
    const messageToken = '__WOC_CHAT_MESSAGE__';
    const rendered = t(templateKey, { name: nameToken, message: messageToken });
    let senderAppended = false;
    let messageAppended = false;
    for (const part of rendered.split(/(__WOC_CHAT_NAME__|__WOC_CHAT_MESSAGE__)/)) {
      if (part === nameToken) {
        div.append(sender);
        senderAppended = true;
      } else if (part === messageToken) {
        div.append(document.createTextNode(text));
        messageAppended = true;
      } else if (part) {
        div.append(document.createTextNode(part));
      }
    }
    if (!senderAppended || !messageAppended) {
      div.textContent = '';
      div.append(sender, document.createTextNode(`: ${text}`));
    }
    this.chatLogEl.appendChild(div);
    while (this.chatLogEl.children.length > 200) this.chatLogEl.removeChild(this.chatLogEl.firstChild!);
    if (wasNearBottom) this.chatLogEl.scrollTop = this.chatLogEl.scrollHeight;
  }

  private localizeErrorText(text: string): string {
    const exact: Record<string, TranslationKey> = {
      'You are stunned!': 'hud.errors.stunned',
      'You are busy.': 'hud.errors.busy',
      'That ability is not ready yet.': 'hud.errors.abilityNotReady',
      'Not enough rage!': 'hud.errors.notEnoughRage',
      'Not enough energy!': 'hud.errors.notEnoughEnergy',
      'Not enough mana!': 'hud.errors.notEnoughMana',
      'Not enough health.': 'hud.errors.notEnoughHealth',
      'Your target must dodge first.': 'hud.errors.targetMustDodge',
      'That ability requires combo points.': 'hud.errors.requiresCombo',
      "You can't do that while shapeshifted.": 'hud.errors.shapeshifted',
      'You must be stealthed.': 'hud.errors.stealthed',
      "You can't do that while in combat.": 'hud.errors.inCombat',
      'Out of range.': 'hud.errors.outOfRange',
      'You have no target.': 'hud.errors.noTarget',
      'Too close!': 'hud.errors.tooClose',
      'You must be facing your target.': 'hud.errors.facing',
      'You must wield a dagger.': 'hud.errors.dagger',
      'You must be behind your target.': 'hud.errors.behindTarget',
      'This creature cannot be polymorphed.': 'hud.errors.polymorph',
      'You have no active Seal.': 'hud.errors.noSeal',
      'You cannot taunt that.': 'hud.errors.cannotTaunt',
      'You have no pet.': 'hud.errors.noPet',
      'Invalid attack target.': 'hud.errors.invalidAttackTarget',
      'You are sending messages too quickly.': 'hud.errors.chatTooFast',
      'You are sending messages too quickly. Slow down.': 'hud.errors.chatSlowDown',
      'No one has whispered you recently.': 'hud.errors.noRecentWhisper',
      'You mutter to yourself. Nobody hears it.': 'hud.errors.whisperSelf',
      'You are not in a party.': 'hud.errors.notInParty',
      'Only the party leader may invite.': 'hud.errors.partyLeaderInvite',
      'Your party is full.': 'hud.errors.partyFull',
      'That party is full.': 'hud.errors.partyFull',
      'The invitation has expired.': 'hud.errors.invitationExpired',
      'Target is too far away.': 'hud.errors.targetTooFar',
      'A duel is already in progress.': 'hud.errors.duelInProgress',
      'The challenge has expired.': 'hud.errors.challengeExpired',
      'You are already in an arena match.': 'hud.errors.arenaAlreadyInMatch',
      'You cannot queue for the arena while dead.': 'hud.errors.arenaQueueDead',
      'You cannot queue while dueling.': 'hud.errors.arenaQueueDueling',
      'Finish your trade before queueing.': 'hud.errors.arenaQueueTrading',
      'You cannot queue from inside an instance.': 'hud.errors.arenaQueueInstance',
      'A trade is already in progress.': 'hud.errors.tradeInProgress',
      'Target is too far away to trade.': 'hud.errors.tradeTooFar',
      'The trade request has expired.': 'hud.errors.tradeExpired',
      'Trade failed: items or money no longer available.': 'hud.errors.tradeFailed',
      'That quest is not available.': 'questUi.errors.unavailable',
      'That quest is not in your log.': 'questUi.errors.notInLog',
      'That quest is not complete.': 'questUi.errors.incomplete',
      'That quest giver is not nearby.': 'questUi.errors.giverMissing',
      'That quest turn-in is not nearby.': 'questUi.errors.turnInMissing',
      'Too far away.': 'questUi.errors.tooFar',
      'That item is not sold here.': 'itemUi.errors.notSoldHere',
      'Not enough money.': 'itemUi.errors.notEnoughMoney',
      'You must bring your goods to the Merchant.': 'itemUi.errors.bringGoods',
      'The Merchant will not broker quest items.': 'itemUi.errors.noQuestItems',
      'You do not have that many to sell.': 'itemUi.errors.notEnoughToSell',
      'Name a price of at least 1 copper.': 'itemUi.errors.minPrice',
      'That price is beyond what the Merchant will broker.': 'itemUi.errors.priceTooHigh',
      'You are too far from the Merchant.': 'itemUi.errors.tooFar',
      'That listing is no longer available.': 'itemUi.errors.listingUnavailable',
      'You cannot afford that.': 'itemUi.errors.cannotAfford',
      'That is not your listing.': 'itemUi.errors.notYourListing',
      'You have nothing to collect.': 'itemUi.errors.nothingToCollect',
    };
    const key = exact[text];
    if (key) return t(key);

    let match = /^You must be in (Bear|Cat) Form\.$/.exec(text);
    if (match) return t('hud.errors.requiresForm', { form: t(match[1] === 'Bear' ? 'hud.errors.bear' : 'hud.errors.cat') });
    match = /^That ability requires the target below (\d+)% health\.$/.exec(text);
    if (match) return t('hud.errors.targetHealthBelow', { percent: match[1] });
    match = /^Not enough (.+)!$/.exec(text);
    if (match) return t('hud.errors.notEnoughResource', { resource: match[1] });
    match = /^Several players match '(.+)'\. Use exact capitalization\.$/.exec(text);
    if (match) return t('hud.errors.whisperAmbiguous', { name: match[1] });
    match = /^There is no player named '(.+)' online\.$/.exec(text);
    if (match) return t('hud.errors.whisperMissing', { name: match[1] });
    match = /^Unknown command: (.+)\. Try \/s \/y \/w \/p \/g\.$/.exec(text);
    if (match) return t('hud.errors.unknownCommand', { command: match[1] });
    match = /^Chat is on cooldown for (\d+)s\.$/.exec(text);
    if (match) return t('hud.errors.chatCooldown', { seconds: match[1] });
    match = /^Chat locked for (\d+)s because you are sending messages too quickly\.$/.exec(text);
    if (match) return t('hud.errors.chatLocked', { seconds: match[1] });
    match = /^(.+) is already in a party\.$/.exec(text);
    if (match) return t('hud.errors.alreadyInParty', { name: match[1] });
    match = /^(.+) already has a pending invitation\.$/.exec(text);
    if (match) return t('hud.errors.pendingInvite', { name: match[1] });
    match = /^You may keep at most (\d+) goods on the market at once\.$/.exec(text);
    if (match) return t('itemUi.errors.tooManyListings', { count: formatNumber(Number(match[1]), { maximumFractionDigits: 0 }) });
    match = /^That is your own listing (?:\u2014|-) cancel it to reclaim it\.$/.exec(text);
    if (match) return t('itemUi.errors.ownListing');
    return text;
  }

  private localizeSystemText(text: string): string {
    const exact: Record<string, TranslationKey> = {
      'You stand up.': 'hud.logs.standUp',
      'Your party has disbanded.': 'hud.logs.partyDisbanded',
      'The duel has begun!': 'hud.logs.duelBegun',
      'The duel has ended.': 'hud.logs.duelEnded',
      'You join the Ashen Coliseum queue. Stand by for a worthy opponent...': 'hud.logs.arenaJoin',
      'You join the Ashen Coliseum queue. Stand by for a worthy opponent…': 'hud.logs.arenaJoin',
      'You leave the Ashen Coliseum queue.': 'hud.logs.arenaLeave',
      'You step onto the sands of the Ashen Coliseum.': 'hud.logs.arenaSands',
      'Fight!': 'hud.system.arenaStart',
      'Trade window opened.': 'hud.logs.tradeOpened',
      'Trade complete.': 'hud.logs.tradeComplete',
      'Trade cancelled.': 'hud.logs.tradeCancelled',
    };
    const key = exact[text];
    if (key) return t(key);

    let match = /^You have invited (.+) to your party\.$/.exec(text);
    if (match) return t('hud.logs.partyInviteSent', { name: match[1] });
    match = /^(.+) joins the party\.$/.exec(text);
    if (match) return t('hud.logs.partyJoin', { name: match[1] });
    match = /^(.+) declines your invitation\.$/.exec(text);
    if (match) return t('hud.logs.partyDecline', { name: match[1] });
    match = /^(.+) is now the party leader\.$/.exec(text);
    if (match) return t('hud.logs.partyLeader', { name: match[1] });
    match = /^You have challenged (.+) to a duel\.$/.exec(text);
    if (match) return t('hud.logs.duelChallengeSent', { name: match[1] });
    match = /^(.+) declines your challenge\.$/.exec(text);
    if (match) return t('hud.logs.duelDecline', { name: match[1] });
    match = /^You have requested to trade with (.+)\.$/.exec(text);
    if (match) return t('hud.logs.tradeRequestSent', { name: match[1] });
    match = /^(.+) has come online\.$/.exec(text);
    if (match) return t('hud.logs.friendOnline', { name: match[1] });
    match = /^(.+) has gone offline\.$/.exec(text);
    if (match) return t('hud.logs.friendOffline', { name: match[1] });
    match = /^Quest accepted: (.+)$/.exec(text);
    if (match) return t('questUi.logs.accepted', { name: match[1] });
    match = /^Quest abandoned: (.+)$/.exec(text);
    if (match) return t('questUi.logs.abandoned', { name: match[1] });
    match = /^Quest completed: (.+)$/.exec(text);
    if (match) return t('questUi.logs.completed', { name: match[1] });
    match = /^(.+) \(Complete\)$/.exec(text);
    if (match) return t('questUi.logs.ready', { name: match[1], status: t('questUi.log.readyStatus') });
    match = /^Your market listing of (.+) expired and waits at the Merchant\.$/.exec(text);
    if (match) return t('itemUi.logs.expiredListing', { item: match[1] });
    return text;
  }

  private localizeQuestProgressText(questId: string, text: string): string {
    const quest = QUESTS[questId];
    const match = /^(.+): (\d+)\/(\d+)$/.exec(text);
    if (!quest || !match) return text;
    const label = quest.objectives.find((objective) => objective.label === match[1])?.label ?? match[1];
    return t('questUi.logs.progress', {
      label,
      current: this.questNumber(Number(match[2])),
      total: this.questNumber(Number(match[3])),
    });
  }

  private localizeLootText(text: string): string {
    let match = /^You receive: (.+)\.$/.exec(text);
    if (match) return t('hud.logs.lootReceiveItem', { item: match[1] });
    match = /^You receive (.+)\.$/.exec(text);
    if (match) return t('hud.logs.lootReceiveMoney', { money: this.localizeSimMoney(match[1]) });
    match = /^You loot (.+)\.$/.exec(text);
    if (match) return t('hud.logs.lootMoney', { money: this.localizeSimMoney(match[1]) });
    match = /^Sold (.+) for (.+)\.$/.exec(text);
    if (match) return t('hud.logs.soldItem', { item: match[1], money: this.localizeSimMoney(match[2]) });
    match = /^Listed (.+?)( x\d+)? on the World Market for (.+)\.$/.exec(text);
    if (match) return t('itemUi.logs.listedItem', {
      item: this.itemStackLogName(match[1], match[2]),
      money: this.localizeSimMoney(match[3]),
    });
    match = /^(.+) bought your (.+) for (.+?) (?:\u2014|-) collect (.+) from the Merchant\.$/.exec(text);
    if (match) return t('itemUi.logs.sellerSold', {
      buyer: match[1],
      item: match[2],
      money: this.localizeSimMoney(match[3]),
      proceeds: this.localizeSimMoney(match[4]),
    });
    match = /^Bought (.+?)( x\d+)? for (.+)\.$/.exec(text);
    if (match) return t('itemUi.logs.boughtItem', {
      item: this.itemStackLogName(match[1], match[2]),
      money: this.localizeSimMoney(match[3]),
    });
    match = /^Reclaimed (.+?)( x\d+)? from the market\.$/.exec(text);
    if (match) return t('itemUi.logs.reclaimedItem', { item: this.itemStackLogName(match[1], match[2]) });
    match = /^You collect (.+) from the Merchant\.$/.exec(text);
    if (match) return t('itemUi.logs.collectedMoney', { money: this.localizeSimMoney(match[1]) });
    return text;
  }

  private itemStackLogName(item: string, stackSuffix?: string): string {
    if (!stackSuffix) return item;
    const count = Number(stackSuffix.trim().slice(1));
    return `${item} ${t('itemUi.bags.stackCount', { count: formatNumber(count, { maximumFractionDigits: 0 }) })}`;
  }

  private localizeSimMoney(text: string): string {
    const copper = parseSimMoney(text);
    return copper === null ? text : formatLocalizedMoney(copper);
  }

  private combatLog(text: string, color = '#ccc'): void {
    this.appendLog(this.combatLogEl, text, color);
  }

  private appendLog(el: HTMLElement, text: string, color: string): void {
    const wasNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    const div = document.createElement('div');
    div.textContent = text;
    div.style.color = color;
    el.appendChild(div);
    while (el.children.length > 200) el.removeChild(el.firstChild!);
    if (wasNearBottom) el.scrollTop = el.scrollHeight;
  }

  private fct(target: Entity, text: string, color: string, crit: boolean): void {
    const v = this.renderer.worldToScreen(target.pos.x, target.pos.y + 2.2 * target.scale, target.pos.z);
    if (v.behind) return;
    const el = document.createElement('div');
    el.className = 'fct' + (crit ? ' crit' : '');
    el.style.color = color;
    el.style.left = `${v.x + (Math.random() * 30 - 15)}px`;
    el.style.top = `${v.y}px`;
    el.textContent = text;
    document.getElementById('ui')!.appendChild(el);
    setTimeout(() => el.remove(), 1250);
  }

  showError(text: string): void {
    this.errorEl.textContent = text;
    this.errorEl.style.opacity = '1';
    clearTimeout(this.errorTimer);
    this.errorTimer = window.setTimeout(() => { this.errorEl.style.opacity = '0'; }, 1600);
    audio.error();
  }

  showBanner(text: string): void {
    this.bannerEl.textContent = text;
    this.bannerEl.style.opacity = '1';
    clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => { this.bannerEl.style.opacity = '0'; }, 2600);
  }

  // -------------------------------------------------------------------------
  // Quest dialog (gossip)
  // -------------------------------------------------------------------------

  openQuestDialog(npcId: number): void {
    const npc = this.sim.entities.get(npcId);
    if (!npc || npc.kind !== 'npc') return;
    if ($('#quest-dialog').style.display !== 'block') this.questDialogReturnFocus = this.currentFocusableElement();
    this.renderGossip(npc);
  }

  private renderGossip(npc: Entity): void {
    this.openGossipNpcId = npc.id;
    this.openQuestDetailId = null;
    const el = $('#quest-dialog');
    const def = NPCS[npc.templateId];
    // accepted-but-unfinished quests are tracked in the quest log; the NPC
    // only offers new quests (at the giver) and turn-ins (at the turn-in NPC)
    const interesting = npc.questIds.filter((q) => {
      const st = this.sim.questState(q);
      return (st === 'available' && QUESTS[q].giverNpcId === npc.templateId)
        || (st === 'ready' && QUESTS[q].turnInNpcId === npc.templateId);
    });
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'false');
    el.setAttribute('aria-labelledby', 'quest-dialog-title');
    el.setAttribute('tabindex', '-1');
    let html = `<div class="panel-title"><span id="quest-dialog-title">${esc(npc.name)}<span class="quest-muted"> &lt;${esc(def?.title ?? '')}&gt;</span></span><button type="button" class="x-btn" data-close aria-label="${esc(t('questUi.dialog.close'))}">✕</button></div>`;
    html += `<div class="qd-text">"${esc((def?.greeting ?? t('questUi.dialog.greetingFallback')).replace('$C', CLASSES[this.sim.cfg.playerClass].name.toLowerCase()))}"</div>`;
    if (interesting.length > 0) {
      for (const qid of interesting) {
        const st = this.sim.questState(qid);
        const icon = st === 'ready' ? '<span class="gold">?</span> ' : '<span class="gold">!</span> ';
        const aria = st === 'ready'
          ? t('questUi.dialog.readyQuestAria', { name: QUESTS[qid].name })
          : t('questUi.dialog.availableQuestAria', { name: QUESTS[qid].name });
        html += `<button type="button" class="qd-list-item" data-quest="${esc(qid)}" aria-label="${esc(aria)}">${icon}${esc(QUESTS[qid].name)}</button>`;
      }
    }
    if (npc.vendorItems.length > 0) {
      html += `<button type="button" class="qd-list-item" data-vendor="1" aria-label="${esc(t('questUi.dialog.browseGoodsAria', { name: npc.name }))}"><span class="quest-complete">$</span> ${esc(t('questUi.dialog.browseGoods'))}</button>`;
    }
    if (def?.market) {
      html += `<button type="button" class="qd-list-item" data-market="1" aria-label="${esc(t('questUi.dialog.worldMarketAria'))}"><span class="gold">$</span> ${esc(t('questUi.dialog.worldMarket'))}</button>`;
    }
    el.innerHTML = html;
    el.querySelectorAll('[data-quest]').forEach((item) => {
      item.addEventListener('click', () => this.renderQuestDetail(npc, (item as HTMLElement).dataset.quest!));
    });
    el.querySelector('[data-vendor]')?.addEventListener('click', () => {
      this.closeQuestDialog(false);
      this.openVendor(npc.id);
    });
    el.querySelector('[data-market]')?.addEventListener('click', () => {
      this.closeQuestDialog(false);
      this.openMarket();
    });
    el.querySelector('[data-close]')?.addEventListener('click', () => this.closeQuestDialog());
    el.style.display = 'block';
    this.focusFirstInteractive(el);
  }

  private renderQuestDetail(npc: Entity, questId: string): void {
    const el = $('#quest-dialog');
    const quest = QUESTS[questId];
    this.openQuestDetailId = questId;
    const state = this.sim.questState(questId);
    const text = (state === 'ready' ? quest.completionText : quest.text).replace(/\$N/g, this.sim.player.name);
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'false');
    el.setAttribute('aria-labelledby', 'quest-dialog-title');
    el.setAttribute('tabindex', '-1');
    let html = `<div class="panel-title"><span id="quest-dialog-title">${esc(quest.name)}${this.questSuggestedPlayersHtml(quest.suggestedPlayers)}</span><button type="button" class="x-btn" data-close aria-label="${esc(t('questUi.dialog.close'))}">✕</button></div>`;
    html += `<div class="qd-text">${esc(text)}</div>`;
    if (state !== 'ready') {
      const qp = this.sim.questLog.get(questId);
      html += `<div class="qd-sub">${esc(t('questUi.detail.objectives'))}</div>`;
      html += quest.objectives.map((o, i) => `<div class="qd-obj">${esc(this.questProgressText(o.label, qp ? Math.min(qp.counts[i], o.count) : 0, o.count))}</div>`).join('');
    }
    html += `<div class="qd-sub">${esc(t('questUi.detail.rewards'))}</div>`;
    html += `<div class="qd-obj">${esc(t('questUi.detail.xpReward', { xp: this.questNumber(quest.xpReward) }))} &nbsp; ${this.moneyHtml(quest.copperReward)}</div>`;
    const rewardItem = quest.itemRewards[this.sim.cfg.playerClass];
    if (rewardItem) {
      const item = ITEMS[rewardItem];
      html += `<div class="qd-reward-row" data-reward><span class="qd-reward-label">${esc(t('questUi.detail.itemReward'))}</span>${this.itemIcon(item)}<span class="qd-reward-name" style="color:${QUALITY_COLOR[item.quality ?? 'common'] ?? '#fff'}">${esc(item.name)}</span></div>`;
    }
    el.innerHTML = html;
    const rewardRow = el.querySelector('[data-reward]') as HTMLElement | null;
    if (rewardRow && rewardItem) this.attachTooltip(rewardRow, () => this.itemTooltip(ITEMS[rewardItem]));

    if (state === 'available') {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.type = 'button';
      btn.textContent = t('questUi.dialog.accept');
      btn.addEventListener('click', () => { this.sim.acceptQuest(questId); this.renderGossip(npc); });
      el.appendChild(btn);
    } else if (state === 'ready') {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.type = 'button';
      btn.textContent = t('questUi.dialog.completeQuest');
      btn.addEventListener('click', () => { this.sim.turnInQuest(questId); this.renderGossip(npc); });
      el.appendChild(btn);
    }
    const back = document.createElement('button');
    back.className = 'btn';
    back.type = 'button';
    back.textContent = t('questUi.dialog.back');
    back.addEventListener('click', () => this.renderGossip(npc));
    el.appendChild(back);
    el.querySelector('[data-close]')?.addEventListener('click', () => this.closeQuestDialog());
    el.style.display = 'block';
    this.focusFirstInteractive(el);
  }

  closeQuestDialog(restoreFocus = true): void {
    $('#quest-dialog').style.display = 'none';
    this.openGossipNpcId = null;
    this.openQuestDetailId = null;
    this.hideTooltip();
    const target = this.questDialogReturnFocus;
    this.questDialogReturnFocus = null;
    if (restoreFocus) this.restoreFocus(target);
  }

  // Re-render the open gossip dialog after quest state changes so completed
  // quests can never be accepted again from a stale dialog.
  private refreshGossip(): void {
    if (this.openGossipNpcId === null || $('#quest-dialog').style.display !== 'block') return;
    const npc = this.sim.entities.get(this.openGossipNpcId);
    if (npc) this.renderGossip(npc);
    else this.closeQuestDialog();
  }

  // -------------------------------------------------------------------------
  // Loot window
  // -------------------------------------------------------------------------

  openLoot(mobId: number, screenX: number, screenY: number): void {
    const mob = this.sim.entities.get(mobId);
    if (!mob?.loot) return;
    this.openLootMobId = mobId;
    const el = $('#loot-window');
    let html = `<div class="panel-title"><span>${mob.name}</span><span class="x-btn" data-close>✕</span></div>`;
    if (mob.loot.copper > 0) {
      html += `<div class="loot-item"><img class="item-icon q-common" src="${iconDataUrl('item', 'coin_gold')}" alt="" draggable="false"><span>${this.moneyHtml(mob.loot.copper)}</span></div>`;
    }
    for (const s of mob.loot.items) {
      const item = ITEMS[s.itemId];
      html += `<div class="loot-item" data-item="${s.itemId}">${this.itemIcon(item)}<span style="font-size:12px">${item.name}${s.count > 1 ? ' x' + s.count : ''}</span></div>`;
    }
    el.innerHTML = html;
    el.querySelectorAll('[data-item]').forEach((row) => {
      const itemId = (row as HTMLElement).dataset.item!;
      this.attachTooltip(row as HTMLElement, () => this.itemTooltip(ITEMS[itemId]));
    });
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = 'Take All';
    btn.addEventListener('click', () => { this.sim.lootCorpse(mobId); this.closeLoot(); });
    el.appendChild(btn);
    el.querySelector('[data-close]')?.addEventListener('click', () => this.closeLoot());
    el.style.left = `${Math.min(window.innerWidth - 260, Math.max(10, screenX - 115))}px`;
    el.style.top = `${Math.min(window.innerHeight - 280, Math.max(10, screenY - 30))}px`;
    el.style.display = 'block';
  }

  closeLoot(): void {
    $('#loot-window').style.display = 'none';
    this.openLootMobId = null;
    this.hideTooltip();
  }

  // -------------------------------------------------------------------------
  // Vendor
  // -------------------------------------------------------------------------

  openVendor(npcId: number): void {
    this.openVendorNpcId = npcId;
    this.renderVendor();
    this.renderBags();
    $('#bags').style.display = 'block';
  }

  private renderVendor(): void {
    if (this.openVendorNpcId === null) return;
    const npc = this.sim.entities.get(this.openVendorNpcId);
    if (!npc) return;
    const el = $('#vendor-window');
    // the rebuild replaces the hovered row (its mouseleave never fires) and
    // collapses the scrolled list — drop the tooltip and restore the scroll
    this.hideTooltip();
    const scrollTop = el.scrollTop;
    let html = `<div class="panel-title"><span>${esc(t('itemUi.vendor.goodsTitle', { name: npc.name }))}</span><button type="button" class="x-btn" data-close aria-label="${esc(t('itemUi.vendor.close'))}">✕</button></div>`;
    el.innerHTML = html;
    for (const itemId of npc.vendorItems) {
      const item = ITEMS[itemId];
      if (!item?.buyValue) continue;
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'vendor-item';
      const price = formatLocalizedMoney(item.buyValue);
      row.setAttribute('aria-label', t('itemUi.vendor.buyAria', { item: item.name, price }));
      row.innerHTML = `${this.itemIcon(item)}<span class="vi-name">${esc(item.name)}</span><span class="vi-price">${this.moneyHtml(item.buyValue)}</span>`;
      row.addEventListener('click', () => {
        this.sim.buyItem(npc.id, itemId);
      });
      this.attachTooltip(row, () => this.itemTooltip(item) + `<div class="tt-sub">${esc(t('itemUi.tooltip.clickBuy'))}</div>`);
      el.appendChild(row);
    }
    const hint = document.createElement('div');
    hint.className = 'vendor-hint';
    hint.textContent = t('itemUi.vendor.hint');
    el.appendChild(hint);
    el.querySelector('[data-close]')?.addEventListener('click', () => this.closeVendor());
    el.style.display = 'block';
    el.scrollTop = scrollTop;
  }

  closeVendor(): void {
    $('#vendor-window').style.display = 'none';
    this.openVendorNpcId = null;
    this.hideTooltip();
    if ($('#bags').style.display === 'block') this.renderBags();
  }

  get vendorOpen(): boolean {
    return this.openVendorNpcId !== null;
  }

  // -------------------------------------------------------------------------
  // The World Market — the Merchant's auction house
  // -------------------------------------------------------------------------

  openMarket(): void {
    this.marketOpen = true;
    this.marketTab = 'browse';
    this.marketSellItem = null;
    this.lastMarketSig = '';
    this.renderMarket();
    $('#market-window').style.display = 'flex';
    // bags ride alongside so you can click items straight onto the Sell tab
    this.renderBags();
    $('#bags').style.display = 'block';
    audio.bagOpen();
  }

  closeMarket(): void {
    if (!this.marketOpen) return;
    this.marketOpen = false;
    this.marketSellItem = null;
    $('#market-window').style.display = 'none';
    this.hideTooltip();
    if ($('#bags').style.display === 'block') this.renderBags();
  }

  get marketWindowOpen(): boolean {
    return this.marketOpen;
  }

  private nearbyMarketNpc(): Entity | null {
    const p = this.sim.player;
    for (const e of this.sim.entities.values()) {
      if (e.kind === 'npc' && NPCS[e.templateId]?.market && dist2d(p.pos, e.pos) <= 8) return e;
    }
    return null;
  }

  private bagCount(itemId: string): number {
    return this.sim.inventory.filter((s) => s.itemId === itemId).reduce((n, s) => n + s.count, 0);
  }

  private renderMarket(): void {
    const el = $('#market-window');
    this.hideTooltip();
    const info = this.sim.marketInfo;
    const collectN = info ? (info.collectionCopper > 0 ? 1 : 0) + info.collectionItems.length : 0;
    const tabLabel = (id: typeof this.marketTab): string => {
      if (id === 'browse') return t('itemUi.market.browse');
      if (id === 'sell') return t('itemUi.market.sell');
      return collectN > 0
        ? t('itemUi.market.collectWithCount', { count: formatNumber(collectN, { maximumFractionDigits: 0 }) })
        : t('itemUi.market.collect');
    };
    const tab = (id: typeof this.marketTab) =>
      `<button type="button" class="mkt-tab${this.marketTab === id ? ' sel' : ''}" data-tab="${id}" aria-pressed="${this.marketTab === id ? 'true' : 'false'}">${esc(tabLabel(id))}</button>`;
    el.innerHTML =
      `<div class="panel-title"><span>${esc(t('itemUi.market.title'))} <span class="panel-subtitle">${esc(t('itemUi.market.subtitle'))}</span></span><button type="button" class="x-btn" data-close aria-label="${esc(t('itemUi.market.close'))}">✕</button></div>`
      + `<div class="mkt-tabs">`
      + tab('browse')
      + tab('sell')
      + tab('collect')
      + `</div>`
      + `<div id="market-body"></div>`;
    el.querySelector('[data-close]')?.addEventListener('click', () => this.closeMarket());
    el.querySelectorAll('[data-tab]').forEach((t) => {
      t.addEventListener('click', () => {
        const next = (t as HTMLElement).dataset.tab as typeof this.marketTab;
        if (next === this.marketTab) return;
        this.marketTab = next;
        this.lastMarketSig = '';
        audio.click();
        this.renderMarket();
      });
    });
    this.renderMarketContent(info);
  }

  // Per-frame: refresh the live lists (Browse/Collect) when they change. The
  // Sell tab holds typed inputs, so it is only rebuilt on explicit actions.
  private refreshMarket(): void {
    if (!this.marketOpen || this.marketTab === 'sell') return;
    const info = this.sim.marketInfo;
    const collectN = info ? (info.collectionCopper > 0 ? 1 : 0) + info.collectionItems.length : 0;
    const sig = JSON.stringify([this.marketTab, info?.listings, info?.collectionCopper, info?.collectionItems]);
    if (sig === this.lastMarketSig) return;
    this.lastMarketSig = sig;
    const collectTab = $('#market-window').querySelector('[data-tab="collect"]');
    if (collectTab) {
      collectTab.textContent = collectN > 0
        ? t('itemUi.market.collectWithCount', { count: formatNumber(collectN, { maximumFractionDigits: 0 }) })
        : t('itemUi.market.collect');
    }
    this.renderMarketContent(info);
  }

  private renderMarketContent(info: MarketInfo | null): void {
    const body = document.getElementById('market-body');
    if (!body) return;
    if (!info) { body.innerHTML = `<div class="mkt-empty">${esc(t('itemUi.market.noMerchant'))}</div>`; return; }
    if (this.marketTab === 'browse') this.renderMarketBrowse(body, info);
    else if (this.marketTab === 'sell') this.renderMarketSell(body, info);
    else this.renderMarketCollect(body, info);
  }

  private renderMarketBrowse(body: HTMLElement, info: MarketInfo): void {
    if (info.listings.length === 0) {
      body.innerHTML = `<div class="mkt-empty">${esc(t('itemUi.market.emptyBrowse'))}</div>`;
      return;
    }
    body.innerHTML = `<div class="mkt-note">${esc(t('itemUi.market.browseNote'))}</div>`;
    for (const l of info.listings) {
      const item = ITEMS[l.itemId];
      if (!item) continue;
      const qColor = QUALITY_COLOR[item.quality ?? 'common'] ?? '#fff';
      const row = document.createElement('div');
      row.className = 'mkt-row';
      const each = l.count > 1 ? `<br><span class="seller">${esc(t('itemUi.market.each', { money: formatLocalizedMoney(Math.ceil(l.price / l.count)) }))}</span>` : '';
      const stack = l.count > 1 ? ` <span class="stack">${esc(t('itemUi.market.stackCount', { count: formatNumber(l.count, { maximumFractionDigits: 0 }) }))}</span>` : '';
      row.innerHTML =
        `${this.itemIcon(item)}`
        + `<span class="mkt-name"><span class="nm" style="color:${qColor}">${esc(item.name)}${stack}</span>`
        + `<span class="seller${l.house ? ' house' : ''}">${esc(l.house ? t('itemUi.market.merchantStock') : l.sellerName)}</span></span>`
        + `<span class="mkt-price">${this.moneyHtml(l.price)}${each}</span>`;
      const btn = document.createElement('button');
      btn.className = 'mkt-btn' + (l.mine ? ' cancel' : '');
      btn.textContent = l.mine ? t('itemUi.market.reclaim') : t('itemUi.market.buy');
      btn.setAttribute('aria-label', t(l.mine ? 'itemUi.market.reclaimAria' : 'itemUi.market.buyAria', {
        item: item.name,
        price: formatLocalizedMoney(l.price),
      }));
      btn.addEventListener('click', () => {
        if (l.mine) this.sim.marketCancel(l.id);
        else this.sim.marketBuy(l.id);
        audio.click();
      });
      row.appendChild(btn);
      this.attachTooltip(row, () => this.itemTooltip(item));
      body.appendChild(row);
    }
  }

  private renderMarketSell(body: HTMLElement, info: MarketInfo): void {
    body.innerHTML = `<div class="mkt-note">${esc(t('itemUi.market.sellNote', {
      cut: formatNumber(info.cutPct, { maximumFractionDigits: 0 }),
      used: formatNumber(info.myListingCount, { maximumFractionDigits: 0 }),
      max: formatNumber(info.maxListings, { maximumFractionDigits: 0 }),
    }))}</div>`;
    const item = this.marketSellItem ? ITEMS[this.marketSellItem] : null;
    const have = this.marketSellItem ? this.bagCount(this.marketSellItem) : 0;
    const pick = document.createElement('div');
    if (!item || have <= 0) {
      pick.className = 'mkt-sell-pick empty';
      pick.textContent = t('itemUi.market.sellPickEmpty');
      body.appendChild(pick);
      return;
    }
    const qColor = QUALITY_COLOR[item.quality ?? 'common'] ?? '#fff';
    pick.className = 'mkt-sell-pick';
    pick.innerHTML = `${this.itemIcon(item)}<span class="ps-name" style="color:${qColor}">${esc(item.name)}</span>`;
    body.appendChild(pick);

    const form = document.createElement('div');
    form.className = 'mkt-price-form';
    const qtyRow = have > 1
      ? `<div class="mkt-price-row"><label for="mkt-qty">${esc(t('itemUi.market.quantity'))}</label><input class="coininput" id="mkt-qty" type="number" min="1" max="${have}" value="1"> <span class="mkt-coin-tag">${esc(t('itemUi.market.quantityOf', { count: formatNumber(have, { maximumFractionDigits: 0 }) }))}</span></div>`
      : '';
    // a gentle starting ask: a few times vendor value, never below 1c
    const suggested = Math.max(1, item.buyValue ?? Math.max(1, item.sellValue) * 4);
    const g = Math.floor(suggested / 10000), s = Math.floor((suggested % 10000) / 100), c = suggested % 100;
    form.innerHTML = qtyRow
      + `<div class="mkt-price-row"><label>${esc(t('itemUi.market.priceEach'))}</label>`
      + `<input class="coininput" id="mkt-g" type="number" min="0" value="${g}" aria-label="${esc(t('itemUi.money.gold'))}"><span class="mkt-coin-tag">${esc(t('itemUi.money.goldShort'))}</span>`
      + `<input class="coininput" id="mkt-s" type="number" min="0" max="99" value="${s}" aria-label="${esc(t('itemUi.money.silver'))}"><span class="mkt-coin-tag">${esc(t('itemUi.money.silverShort'))}</span>`
      + `<input class="coininput" id="mkt-c" type="number" min="0" max="99" value="${c}" aria-label="${esc(t('itemUi.money.copper'))}"><span class="mkt-coin-tag">${esc(t('itemUi.money.copperShort'))}</span></div>`;
    body.appendChild(form);

    const listBtn = document.createElement('button');
    listBtn.className = 'mkt-list-btn';
    listBtn.textContent = t('itemUi.market.listButton');
    listBtn.addEventListener('click', () => {
      const qty = have > 1 ? Math.max(1, Math.min(have, parseInt(($('#mkt-qty') as HTMLInputElement)?.value || '1', 10) || 1)) : 1;
      const gg = Math.max(0, parseInt(($('#mkt-g') as HTMLInputElement)?.value || '0', 10) || 0);
      const ss = Math.max(0, parseInt(($('#mkt-s') as HTMLInputElement)?.value || '0', 10) || 0);
      const cc = Math.max(0, parseInt(($('#mkt-c') as HTMLInputElement)?.value || '0', 10) || 0);
      const each = gg * 10000 + ss * 100 + cc;
      if (each < 1) { this.showError(t('itemUi.market.minPriceError')); return; }
      this.sim.marketList(this.marketSellItem!, qty, each * qty);
      this.marketSellItem = null;
      audio.coin();
      this.renderMarket(); // the next snapshot echoes the new bags + listings
    });
    body.appendChild(listBtn);
  }

  private renderMarketCollect(body: HTMLElement, info: MarketInfo): void {
    if (info.collectionCopper <= 0 && info.collectionItems.length === 0) {
      body.innerHTML = `<div class="mkt-empty">${esc(t('itemUi.market.collectEmpty'))}</div>`;
      return;
    }
    body.innerHTML = `<div class="mkt-note">${esc(t('itemUi.market.collectNote'))}</div>`;
    if (info.collectionCopper > 0) {
      const row = document.createElement('div');
      row.className = 'mkt-collect';
      row.innerHTML = `<span>${esc(t('itemUi.market.saleProceeds'))}</span><span class="mkt-price">${this.moneyHtml(info.collectionCopper)}</span>`;
      body.appendChild(row);
    }
    for (const s of info.collectionItems) {
      const item = ITEMS[s.itemId];
      if (!item) continue;
      const qColor = QUALITY_COLOR[item.quality ?? 'common'] ?? '#fff';
      const row = document.createElement('div');
      row.className = 'mkt-collect';
      const stack = s.count > 1 ? ` ${t('itemUi.market.stackCount', { count: formatNumber(s.count, { maximumFractionDigits: 0 }) })}` : '';
      row.innerHTML = `<span style="display:flex;gap:8px;align-items:center">${this.itemIcon(item)}<span style="color:${qColor}">${esc(item.name)}${esc(stack)}</span></span>`;
      this.attachTooltip(row, () => this.itemTooltip(item));
      body.appendChild(row);
    }
    const btn = document.createElement('button');
    btn.className = 'mkt-list-btn';
    btn.textContent = t('itemUi.market.collectAll');
    btn.addEventListener('click', () => { this.sim.marketCollect(); audio.coin(); });
    body.appendChild(btn);
  }

  // -------------------------------------------------------------------------
  // Bags
  // -------------------------------------------------------------------------

  toggleBags(): void {
    const el = $('#bags');
    if (el.style.display === 'block') { el.style.display = 'none'; this.hideTooltip(); audio.bagClose(); return; }
    this.renderBags();
    el.style.display = 'block';
    audio.bagOpen();
  }

  // Called when an authoritative inventory delta lands (online snapshots
  // carry inventory separately from the event frames that normally redraw).
  onInventoryChanged(): void {
    if ($('#bags').style.display === 'block') this.renderBags();
  }

  renderBags(): void {
    const el = $('#bags');
    const sim = this.sim;
    el.innerHTML = `<div class="panel-title"><span>${esc(t('itemUi.bags.title'))}</span><button type="button" class="x-btn" data-close aria-label="${esc(t('itemUi.bags.close'))}">✕</button></div>`;
    const grid = document.createElement('div');
    grid.className = 'bag-grid';
    if (sim.inventory.length === 0) {
      grid.innerHTML = `<div class="bag-empty">${esc(t('itemUi.bags.empty'))}</div>`;
    }
    for (const s of [...sim.inventory]) {
      const item = ITEMS[s.itemId];
      if (!item) continue;
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'bag-item';
      const qColor = QUALITY_COLOR[item.quality ?? 'common'] ?? '#fff';
      row.setAttribute('aria-label', t('itemUi.bags.itemAria', {
        item: item.name,
        count: formatNumber(s.count, { maximumFractionDigits: 0 }),
      }));
      row.innerHTML = `${this.itemIcon(item)}<span style="color:${qColor}">${esc(item.name)}</span><span class="bi-count">${s.count > 1 ? esc(t('itemUi.bags.stackCount', { count: formatNumber(s.count, { maximumFractionDigits: 0 }) })) : ''}</span>`;
      row.addEventListener('click', () => {
        if (this.tradeOpen) {
          this.addItemToTrade(s.itemId);
        } else if (this.marketOpen && this.marketTab === 'sell') {
          if (item.kind === 'quest') { this.showError(t('itemUi.errors.noQuestItems')); return; }
          this.marketSellItem = s.itemId;
          this.renderMarket();
        } else if (this.vendorOpen) {
          this.sim.sellItem(s.itemId);
        } else {
          this.sim.useItem(s.itemId);
          this.renderBags();
        }
      });
      this.attachTooltip(row, () => {
        let extra = '';
        if (this.tradeOpen) extra = `<div class="tt-sub">${esc(t('itemUi.tooltip.clickTradeOffer'))}</div>`;
        else if (this.marketOpen && this.marketTab === 'sell') extra = item.kind === 'quest' ? `<div class="tt-sub">${esc(t('itemUi.tooltip.cannotMarket'))}</div>` : `<div class="tt-sub">${esc(t('itemUi.tooltip.clickMarketList'))}</div>`;
        else if (this.vendorOpen) extra = `<div class="tt-sub">${esc(t('itemUi.tooltip.clickSell'))}</div>`;
        else if (item.kind === 'weapon' || item.kind === 'armor') extra = `<div class="tt-sub">${esc(t('itemUi.tooltip.clickEquip'))}</div>`;
        else if (item.kind === 'food' || item.kind === 'drink') extra = `<div class="tt-sub">${esc(t('itemUi.tooltip.clickConsume'))}</div>`;
        return this.itemTooltip(item) + extra;
      });
      grid.appendChild(row);
    }
    el.appendChild(grid);
    const money = document.createElement('div');
    money.className = 'money';
    money.innerHTML = this.moneyHtml(sim.copper);
    el.appendChild(money);
    el.querySelector('[data-close]')?.addEventListener('click', () => { el.style.display = 'none'; this.hideTooltip(); });
  }

  // -------------------------------------------------------------------------
  // Character window
  // -------------------------------------------------------------------------

  toggleChar(): void {
    const el = $('#char-window');
    if (el.style.display === 'block') { el.style.display = 'none'; this.hideTooltip(); return; }
    this.renderChar();
    el.style.display = 'block';
  }

  renderChar(): void {
    const el = $('#char-window');
    const sim = this.sim;
    const p = sim.player;
    const cls = CLASSES[sim.cfg.playerClass];
    const className = classDisplayName(cls.id);
    let html = `<div class="panel-title"><span>${esc(p.name)} <span class="panel-subtitle">${esc(t('itemUi.equipment.levelClass', { level: formatNumber(p.level, { maximumFractionDigits: 0 }), className }))}</span></span><button type="button" class="x-btn" data-close aria-label="${esc(t('hud.options.returnToGame'))}">✕</button></div>`;
    html += `<div class="paperdoll"><div class="equip-col" id="equip-col"></div></div>`;
    const wpn = sim.equipment.mainhand ? ITEMS[sim.equipment.mainhand] : null;
    const dps = wpn?.weapon ? ((wpn.weapon.min + wpn.weapon.max) / 2 + (p.attackPower / 14) * wpn.weapon.speed) / wpn.weapon.speed : 0;
    html += `<div class="char-stats">
      <span>${esc(t('itemUi.stats.str'))}: <b>${formatNumber(p.stats.str, { maximumFractionDigits: 0 })}</b></span><span>${esc(t('itemUi.stats.armor'))}: <b>${formatNumber(p.stats.armor, { maximumFractionDigits: 0 })}</b></span>
      <span>${esc(t('itemUi.stats.agi'))}: <b>${formatNumber(p.stats.agi, { maximumFractionDigits: 0 })}</b></span><span>${esc(t('itemUi.stats.attackPower'))}: <b>${formatNumber(p.attackPower, { maximumFractionDigits: 0 })}</b></span>
      <span>${esc(t('itemUi.stats.sta'))}: <b>${formatNumber(p.stats.sta, { maximumFractionDigits: 0 })}</b></span><span>${esc(t('itemUi.stats.dps'))}: <b>${formatNumber(dps, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</b></span>
      <span>${esc(t('itemUi.stats.int'))}: <b>${formatNumber(p.stats.int, { maximumFractionDigits: 0 })}</b></span><span>${esc(t('itemUi.stats.critChance'))}: <b>${formatNumber(p.critChance * 100, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</b></span>
      <span>${esc(t('itemUi.stats.spi'))}: <b>${formatNumber(p.stats.spi, { maximumFractionDigits: 0 })}</b></span><span>${esc(t('itemUi.stats.dodge'))}: <b>${formatNumber(p.dodgeChance * 100, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</b></span>
    </div>`;
    el.innerHTML = html;
    const col = el.querySelector('#equip-col')!;
    const slots: { key: EquipSlot; name: string }[] = [
      { key: 'mainhand', name: itemSlotName('mainhand') },
      { key: 'chest', name: itemSlotName('chest') },
      { key: 'legs', name: itemSlotName('legs') },
      { key: 'feet', name: itemSlotName('feet') },
    ];
    for (const slot of slots) {
      const itemId = sim.equipment[slot.key];
      const item = itemId ? ITEMS[itemId] : null;
      const row = document.createElement('div');
      row.className = 'equip-slot';
      const qColor = !item ? '#666' : QUALITY_COLOR[item.quality ?? 'common'] ?? '#fff';
      row.innerHTML = `${item ? this.itemIcon(item) : `<img class="item-icon" style="border-color:#444" src="${iconDataUrl('item', 'slot_empty')}" alt="" draggable="false">`}
        <div><div class="slot-name">${esc(slot.name)}</div><div class="slot-item" style="color:${qColor}">${item ? esc(item.name) : esc(t('itemUi.equipment.empty'))}</div></div>`;
      if (item) this.attachTooltip(row, () => this.itemTooltip(item));
      col.appendChild(row);
    }
    el.querySelector('[data-close]')?.addEventListener('click', () => { el.style.display = 'none'; this.hideTooltip(); });
  }

  // -------------------------------------------------------------------------
  // Spellbook
  // -------------------------------------------------------------------------

  toggleSpellbook(): void {
    const el = $('#spellbook');
    if (el.style.display === 'block') { el.style.display = 'none'; this.hideTooltip(); return; }
    this.renderSpellbook();
    el.style.display = 'block';
  }

  renderSpellbook(): void {
    const el = $('#spellbook');
    const sim = this.sim;
    const cls = CLASSES[sim.cfg.playerClass];
    const className = classDisplayName(cls.id);
    el.setAttribute('aria-label', t('abilityUi.spellbook.title'));
    el.innerHTML = `<div class="panel-title"><span>${esc(t('abilityUi.spellbook.title'))} <span class="spellbook-class">${esc(t('abilityUi.spellbook.classSubtitle', { className }))}</span></span><button type="button" class="x-btn" data-close aria-label="${esc(t('abilityUi.spellbook.close'))}">✕</button></div>`;
    const list = document.createElement('div');
    list.className = 'spell-list';
    list.setAttribute('role', 'list');
    el.appendChild(list);
    let rendered = 0;
    for (const abilityId of cls.abilities) {
      const def = ABILITIES[abilityId];
      const known = sim.known.find((k) => k.def.id === abilityId) ?? null;
      const row = document.createElement('div');
      row.className = 'spell-row' + (known ? '' : ' locked');
      row.tabIndex = 0;
      row.setAttribute('role', 'listitem');
      const locked = !known;
      const summary = known ? describeAbilitySummary(known, sim.player.resourceType) : '';
      const name = abilityDisplayName(def);
      const learnLevel = formatAbilityNumber(def.learnLevel);
      row.setAttribute('aria-label', known
        ? t('abilityUi.spellbook.knownAbilityAria', { name, rank: formatAbilityNumber(known.rank), summary })
        : t('abilityUi.spellbook.unlearnedAbilityAria', { name, level: learnLevel }));
      row.innerHTML = `<div class="spell-icon" style="background-image:url(${iconDataUrl('ability', abilityId)})"></div>
        <div class="spell-text"><div class="spell-name">${esc(name)}${known && known.rank > 1 ? ` <span class="spell-rank">${esc(t('abilityUi.tooltip.rank', { rank: formatAbilityNumber(known.rank) }))}</span>` : ''}</div>
        <div class="spell-sub">${locked ? esc(t('abilityUi.spellbook.trainableAtLevel', { level: learnLevel })) : esc(summary)}</div></div>`;
      if (known) this.attachTooltip(row, () => this.abilityTooltip(known));
      else this.attachTooltip(row, () => `<div class="tt-title">${esc(name)}</div><div class="tt-sub">${esc(t('abilityUi.spellbook.learnAtLevel', { level: learnLevel }))}</div>`);
      list.appendChild(row);
      rendered++;
    }
    if (rendered === 0) {
      const empty = document.createElement('div');
      empty.className = 'spell-sub';
      empty.textContent = t('abilityUi.spellbook.empty');
      list.appendChild(empty);
    }
    el.querySelector('[data-close]')?.addEventListener('click', () => { el.style.display = 'none'; this.hideTooltip(); });
  }

  // -------------------------------------------------------------------------
  // Quest log window
  // -------------------------------------------------------------------------

  toggleQuestLog(): void {
    const el = $('#quest-log-window');
    if (el.style.display === 'block') { this.closeQuestLog(); return; }
    this.questLogReturnFocus = this.currentFocusableElement() ?? $('#mm-quest');
    this.renderQuestLog();
    el.style.display = 'block';
  }

  private closeQuestLog(restoreFocus = true): void {
    $('#quest-log-window').style.display = 'none';
    this.hideTooltip();
    const target = this.questLogReturnFocus ?? $('#mm-quest');
    this.questLogReturnFocus = null;
    if (restoreFocus) this.restoreFocus(target, $('#mm-quest'));
  }

  renderQuestLog(): void {
    const el = $('#quest-log-window');
    const sim = this.sim;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'false');
    el.setAttribute('aria-labelledby', 'quest-log-title');
    el.setAttribute('tabindex', '-1');
    el.innerHTML = `<div class="panel-title"><span id="quest-log-title">${esc(t('questUi.log.title'))} <span class="quest-muted">${esc(t('questUi.log.summary', {
      active: this.questNumber(sim.questLog.size),
      completed: this.questNumber(sim.questsDone.size),
    }))}</span></span><button type="button" class="x-btn" data-close aria-label="${esc(t('questUi.log.close'))}">✕</button></div>`;
    const cols = document.createElement('div');
    cols.className = 'ql-cols';
    const list = document.createElement('div');
    list.className = 'ql-list';
    const detail = document.createElement('div');
    detail.className = 'ql-detail';
    cols.append(list, detail);
    el.appendChild(cols);

    const quests = [...sim.questLog.values()];
    if (quests.length === 0) {
      list.innerHTML = `<div class="ql-empty">${esc(t('questUi.log.emptyTitle'))}</div>`;
      detail.innerHTML = `<div class="qd-text">${esc(t('questUi.log.emptyHint'))}</div>`;
    }
    if (!this.selectedQuestLogId || !sim.questLog.has(this.selectedQuestLogId)) {
      this.selectedQuestLogId = quests[0]?.questId ?? null;
    }
    for (const qp of quests) {
      const quest = QUESTS[qp.questId];
      const item = document.createElement('button');
      const status = qp.state === 'ready' ? t('questUi.log.readyStatus') : t('questUi.log.activeStatus');
      item.type = 'button';
      item.className = 'ql-item' + (qp.questId === this.selectedQuestLogId ? ' sel' : '');
      item.setAttribute('aria-pressed', qp.questId === this.selectedQuestLogId ? 'true' : 'false');
      item.setAttribute('aria-label', t('questUi.log.selectedQuestAria', { name: quest.name, status }));
      item.innerHTML = `${esc(quest.name)}${qp.state === 'ready' ? ` <span class="quest-complete">(${esc(t('questUi.log.readyStatus'))})</span>` : ''}`;
      item.addEventListener('click', () => { this.selectedQuestLogId = qp.questId; this.renderQuestLog(); });
      list.appendChild(item);
    }
    if (this.selectedQuestLogId) {
      const qp = sim.questLog.get(this.selectedQuestLogId)!;
      const quest = QUESTS[this.selectedQuestLogId];
      let html = `<div class="qd-sub ql-detail-title">${esc(quest.name)}${this.questSuggestedPlayersHtml(quest.suggestedPlayers)}</div>`;
      html += quest.objectives.map((o, i) => `<div class="qd-obj${qp.counts[i] >= o.count ? ' done' : ''}">${esc(this.questProgressText(o.label, qp.counts[i], o.count))}</div>`).join('');
      html += `<div class="qd-text ql-detail-text">${esc(quest.text.replace(/\$N/g, sim.player.name))}</div>`;
      html += `<div class="qd-sub">${esc(t('questUi.detail.rewards'))}</div><div class="qd-obj">${esc(t('questUi.detail.xpReward', { xp: this.questNumber(quest.xpReward) }))} &nbsp; ${this.moneyHtml(quest.copperReward)}</div>`;
      const rewardItem = quest.itemRewards[sim.cfg.playerClass];
      if (rewardItem) {
        const item = ITEMS[rewardItem];
        html += `<div class="qd-reward-row" data-reward><span class="qd-reward-label">${esc(t('questUi.detail.itemReward'))}</span>${this.itemIcon(item)}<span class="qd-reward-name" style="color:${QUALITY_COLOR[item.quality ?? 'common'] ?? '#fff'}">${esc(item.name)}</span></div>`;
      }
      const giver = NPCS[quest.turnInNpcId];
      html += `<div class="qd-obj quest-return">${esc(t('questUi.log.returnTo', { name: giver?.name ?? '?' }))}</div>`;
      detail.innerHTML = html;
      const rewardRow = detail.querySelector('[data-reward]') as HTMLElement | null;
      if (rewardRow && rewardItem) this.attachTooltip(rewardRow, () => this.itemTooltip(ITEMS[rewardItem]));
      const abandon = document.createElement('button');
      abandon.className = 'btn';
      abandon.type = 'button';
      abandon.textContent = t('questUi.log.abandon');
      abandon.addEventListener('click', () => { sim.abandonQuest(this.selectedQuestLogId!); this.renderQuestLog(); });
      detail.appendChild(abandon);
    }
    el.querySelector('[data-close]')?.addEventListener('click', () => this.closeQuestLog());
    this.focusFirstInteractive(el);
  }

  // -------------------------------------------------------------------------
  // Party frames
  // -------------------------------------------------------------------------

  private updatePartyFrames(): void {
    const el = $('#party-frames');
    const target = this.sim.player.targetId !== null ? this.sim.entities.get(this.sim.player.targetId) : null;
    el.classList.toggle('below-target', !!target && target.kind !== 'object');
    const info = this.sim.partyInfo;
    if (!info) {
      if (el.innerHTML !== '') el.innerHTML = '';
      this.lastPartySig = '';
      return;
    }
    const p = this.sim.player;
    const others = info.members.map((m) => ({
      ...m,
      oor: !m.dead && Math.hypot(m.x - p.pos.x, m.z - p.pos.z) > PARTY_RANGE_YD,
    })).filter((m) => m.pid !== this.sim.playerId);
    // include combat/range state so the frames rebuild when a badge changes
    const sig = others.map((m) => `${m.pid}:${m.hp}/${m.mhp}:${m.res}:${m.dead}:${m.inCombat}:${m.oor ? 1 : 0}:${m.level}`).join('|') + `L${info.leader}`;
    if (sig === this.lastPartySig) return;
    this.lastPartySig = sig;
    el.innerHTML = '';
    for (const m of others) {
      const frame = document.createElement('div');
      frame.className = 'party-frame panel'
        + (m.dead ? ' dead' : m.inCombat ? ' combat' : '')
        + (m.oor ? ' oor' : '');
      frame.style.setProperty('--cls', classCss(m.cls));
      const resClass = m.rtype === 'rage' ? 'rage' : m.rtype === 'energy' ? 'energy' : 'mana';
      const badge = m.dead ? '<span class="pf-badge dead" title="Dead">💀</span>'
        : m.inCombat ? '<span class="pf-badge combat" title="In combat">⚔️</span>' : '';
      const range = m.oor ? '<span class="pf-badge oor" title="Out of range">⤢</span>' : '';
      frame.innerHTML = `
        <div class="pfm-name"><span class="pfm-id">${CLASS_GLYPH[m.cls] ?? ''} ${m.name}</span><span class="pfm-meta">${badge}${range}<span class="lead">${info.leader === m.pid ? '★' : ''}${m.level}</span></span></div>
        <div class="bar hp"><div class="bar-fill" style="transform:scaleX(${(m.hp / Math.max(1, m.mhp)).toFixed(3)})"></div></div>
        <div class="bar ${resClass}"><div class="bar-fill" style="transform:scaleX(${(m.res / Math.max(1, m.mres)).toFixed(3)})"></div></div>`;
      frame.addEventListener('click', () => this.sim.targetEntity(m.pid));
      frame.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        this.openContextMenu(m.pid, m.name, ev.clientX, ev.clientY);
      });
      el.appendChild(frame);
    }
    const leave = document.createElement('button');
    leave.className = 'btn';
    leave.id = 'party-leave';
    leave.textContent = 'Leave Party';
    leave.addEventListener('click', () => this.sim.partyLeave());
    el.appendChild(leave);
  }

  // -------------------------------------------------------------------------
  // Context menu on players
  // -------------------------------------------------------------------------

  openContextMenu(pid: number, name: string, x: number, y: number): void {
    const el = $('#ctx-menu');
    const party = this.sim.partyInfo;
    const isLeader = party?.leader === this.sim.playerId;
    const isMember = !!party?.members.some((m) => m.pid === pid);
    // online play exposes persistent friends/ignore/guild; offline falls back
    // to the client-only chat ignore stored in localStorage
    const online = this.sim.socialInfo !== null;
    const social = this.sim.socialInfo;
    const isFriend = !!social?.friends.some((f) => f.name === name);
    const inGuildWithInvite = !!social?.guild && social.guild.rank !== 'member';
    const alreadyGuilded = !!social?.guild?.members.some((m) => m.name === name);
    const ignored = online
      ? !!social?.blocks.some((b) => b.name === name)
      : this.isChatIgnored(name);
    let html = `<div class="ctx-title">${esc(name)}</div>`;
    if (!isMember) html += `<div class="ctx-item" data-act="invite">${esc(t('hud.chat.context.invite'))}</div>`;
    html += `<div class="ctx-item" data-act="trade">${esc(t('hud.chat.context.trade'))}</div>`;
    html += `<div class="ctx-item" data-act="duel">${esc(t('hud.chat.context.challengeDuel'))}</div>`;
    if (online) html += `<div class="ctx-item" data-act="${isFriend ? 'unfriend' : 'friend'}">${esc(t(isFriend ? 'hud.chat.context.removeFriend' : 'hud.chat.context.addFriend'))}</div>`;
    if (inGuildWithInvite && !alreadyGuilded) html += `<div class="ctx-item" data-act="ginvite">${esc(t('hud.chat.context.inviteGuild'))}</div>`;
    html += `<div class="ctx-item" data-act="ignore">${esc(t(ignored
      ? (online ? 'hud.chat.context.unignore' : 'hud.chat.context.unignoreChat')
      : (online ? 'hud.chat.context.ignore' : 'hud.chat.context.ignoreChat')))}</div>`;
    if (this.reportHooks && pid !== this.sim.playerId) html += `<div class="ctx-item" data-act="report">${esc(t('hud.chat.context.report'))}</div>`;
    if (isLeader && isMember && pid !== this.sim.playerId) html += `<div class="ctx-item" data-act="kick">${esc(t('hud.chat.context.removeParty'))}</div>`;
    html += `<div class="ctx-item" data-act="close">${esc(t('hud.chat.context.cancel'))}</div>`;
    el.innerHTML = html;
    el.style.left = `${Math.min(window.innerWidth - 170, x)}px`;
    el.style.top = `${Math.min(window.innerHeight - 240, y)}px`;
    el.style.display = 'block';
    this.bindContextMenuActions((act) => {
      if (act === 'invite') this.sim.partyInvite(pid);
      else if (act === 'trade') this.sim.tradeRequest(pid);
      else if (act === 'duel') this.sim.duelRequest(pid);
      else if (act === 'friend') this.sim.friendAdd(name);
      else if (act === 'unfriend') this.sim.friendRemove(name);
      else if (act === 'ginvite') this.sim.guildInvite(name);
      else if (act === 'ignore') {
        if (online) { ignored ? this.sim.blockRemove(name) : this.sim.blockAdd(name); }
        else this.toggleChatIgnore(name);
      } else if (act === 'report') this.openReportWindow({ pid, name });
      else if (act === 'kick') this.sim.partyKick(pid);
    });
  }

  private openChatPlayerContextMenu(name: string, x: number, y: number): void {
    const el = $('#ctx-menu');
    const online = this.sim.socialInfo !== null;
    const social = this.sim.socialInfo;
    const isFriend = !!social?.friends.some((f) => f.name === name);
    const canGuildInvite = !!social?.guild && social.guild.rank !== 'member';
    const alreadyGuilded = !!social?.guild?.members.some((m) => m.name === name);
    const ignored = online
      ? !!social?.blocks.some((b) => b.name === name)
      : this.isChatIgnored(name);
    const actions = chatPlayerContextActions({
      playerName: name,
      selfName: this.sim.player.name,
      online,
      isFriend,
      ignored,
      canGuildInvite,
      alreadyGuilded,
      canReport: !!this.reportHooks?.submitByName,
    });
    el.innerHTML = `<div class="ctx-title">${esc(name)}</div>`
      + actions.map((a) => `<div class="ctx-item" data-act="${a.id}">${esc(a.label)}</div>`).join('');
    el.style.left = `${Math.min(window.innerWidth - 170, x)}px`;
    el.style.top = `${Math.min(window.innerHeight - 240, y)}px`;
    el.style.display = 'block';
    this.bindContextMenuActions((act) => {
      const livePid = this.playerPidByName(name);
      if (act === 'whisper') this.startWhisper(name);
      else if (act === 'invite') {
        if (livePid !== null) this.sim.partyInvite(livePid);
        else this.showError(t('hud.system.playerNotNearby'));
      } else if (act === 'friend') this.sim.friendAdd(name);
      else if (act === 'unfriend') this.sim.friendRemove(name);
      else if (act === 'ginvite') this.sim.guildInvite(name);
      else if (act === 'ignore') {
        if (online) { ignored ? this.sim.blockRemove(name) : this.sim.blockAdd(name); }
        else this.toggleChatIgnore(name);
      } else if (act === 'report') this.openReportWindow({ name });
    });
  }

  private bindContextMenuActions(onActivate: (act: string) => void): void {
    const el = $('#ctx-menu');
    el.querySelectorAll<HTMLElement>('.ctx-item').forEach((item) => {
      item.setAttribute('role', 'button');
      item.tabIndex = 0;
      const activate = () => {
        const act = item.dataset.act;
        if (!act) return;
        el.style.display = 'none';
        onActivate(act);
      };
      item.addEventListener('click', activate);
      item.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        ev.preventDefault();
        activate();
      });
    });
  }

  private playerPidByName(name: string): number | null {
    const wanted = name.toLowerCase();
    for (const e of this.sim.entities.values()) {
      if (e.kind === 'player' && e.name.toLowerCase() === wanted) return e.id;
    }
    return null;
  }

  private openReportWindow(target: { pid?: number; name: string }): void {
    if (!this.reportHooks) return;
    const { pid, name } = target;
    const el = $('#report-window');
    el.innerHTML = `
      <div class="panel-title">${esc(t('hud.report.title', { name }))}<button type="button" data-close aria-label="${esc(t('hud.report.cancel'))}" title="${esc(t('hud.report.cancel'))}">×</button></div>
      <label class="report-label" for="report-reason">${esc(t('hud.report.reason'))}</label>
      <select id="report-reason" aria-describedby="report-error">
        <option value="harassment">${esc(t('hud.report.reasons.harassment'))}</option>
        <option value="spam">${esc(t('hud.report.reasons.spam'))}</option>
        <option value="cheating">${esc(t('hud.report.reasons.cheating'))}</option>
        <option value="offensive_name_or_chat">${esc(t('hud.report.reasons.offensiveNameOrChat'))}</option>
        <option value="other">${esc(t('hud.report.reasons.other'))}</option>
      </select>
      <label class="report-label" for="report-details">${esc(t('hud.report.details'))}</label>
      <textarea id="report-details" maxlength="1000" placeholder="${esc(t('hud.report.detailsPlaceholder'))}" aria-describedby="report-error"></textarea>
      <div class="report-error" id="report-error" role="alert" aria-live="polite"></div>
      <div class="report-actions">
        <button class="btn" type="button" id="report-submit">${esc(t('hud.report.submit'))}</button>
        <button class="btn" type="button" data-close>${esc(t('hud.report.cancel'))}</button>
      </div>`;
    el.style.left = `${Math.max(12, Math.min(window.innerWidth - 340, window.innerWidth / 2 - 160))}px`;
    el.style.top = `${Math.max(20, Math.min(window.innerHeight - 300, window.innerHeight / 2 - 150))}px`;
    el.style.display = 'block';
    el.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', () => { el.style.display = 'none'; }));
    const submit = $('#report-submit') as HTMLButtonElement;
    submit.addEventListener('click', () => {
      const reason = ($('#report-reason') as HTMLSelectElement).value;
      const details = ($('#report-details') as HTMLTextAreaElement).value;
      submit.disabled = true;
      const request = pid !== undefined
        ? this.reportHooks!.submit(pid, reason, details)
        : this.reportHooks!.submitByName?.(name, reason, details);
      if (!request) {
        submit.disabled = false;
        $('#report-error').textContent = t('hud.report.failed');
        return;
      }
      request
        .then(() => {
          el.style.display = 'none';
          this.log(t('hud.report.submitted', { name }), '#ffd100');
        })
        .catch((err: unknown) => {
          submit.disabled = false;
          $('#report-error').textContent = this.localizeReportError(err);
        });
    });
  }

  private localizeReportError(err: unknown): string {
    const text = err instanceof Error ? err.message : '';
    const keyByMessage: Record<string, TranslationKey> = {
      'choose a report reason': 'hud.report.chooseReason',
      'invalid report target': 'hud.report.invalidTarget',
      'That player is no longer online.': 'hud.report.targetOffline',
      'That player could not be found.': 'hud.report.targetMissing',
      'cannot report yourself': 'hud.report.cannotReportSelf',
      'you have already reported this player recently': 'hud.report.alreadyReported',
      'reporting character not found': 'hud.report.reportingCharacterMissing',
      'could not submit report': 'hud.report.failed',
    };
    return keyByMessage[text] ? t(keyByMessage[text]) : t('hud.report.failed');
  }

  private chatIgnoreKey(name: string): string {
    return name.trim().toLowerCase();
  }

  private isChatIgnored(name: string): boolean {
    return this.ignoredChatNames.has(this.chatIgnoreKey(name));
  }

  private loadIgnoredChatNames(): Set<string> {
    try {
      const raw = localStorage.getItem(IGNORED_CHAT_NAMES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed.filter((name): name is string => typeof name === 'string') : []);
    } catch {
      return new Set();
    }
  }

  private saveIgnoredChatNames(): void {
    localStorage.setItem(IGNORED_CHAT_NAMES_KEY, JSON.stringify([...this.ignoredChatNames]));
  }

  private toggleChatIgnore(name: string): void {
    const key = this.chatIgnoreKey(name);
    if (!key) return;
    if (this.ignoredChatNames.has(key)) {
      this.ignoredChatNames.delete(key);
      this.log(t('hud.system.noLongerIgnoring', { name }), '#aaf');
    } else {
      this.ignoredChatNames.add(key);
      this.log(t('hud.system.ignoringChat', { name }), '#aaf');
    }
    this.saveIgnoredChatNames();
  }

  closeContextMenu(): void {
    $('#ctx-menu').style.display = 'none';
  }

  // -------------------------------------------------------------------------
  // Social panel: friends / guild / ignore (online play)
  // -------------------------------------------------------------------------

  toggleSocial(): void {
    const el = $('#social-window');
    if (el.classList.contains('open')) { el.classList.remove('open'); return; }
    el.classList.add('open');
    this.socialNotice = null;
    this.lastSocialStruct = this.socialStructSig();
    this.lastSocialContent = JSON.stringify(this.sim.socialInfo);
    this.renderSocial();
  }

  // structural identity of the panel: which tab, online or not, and the guild
  // membership/rank (which changes the footer). Content within a tab — a
  // friend's zone, the roster — doesn't count, so it can refresh in place.
  private socialStructSig(): string {
    const g = this.sim.socialInfo?.guild;
    return `${this.socialTab}|${this.sim.socialInfo !== null}|${g?.id ?? 0}|${g?.rank ?? ''}`;
  }

  // Full rebuild: title, tabs, body, notice, and the tab's footer (with its
  // typeahead). Used on open, tab switch, and guild-membership changes.
  private renderSocial(): void {
    const el = $('#social-window');
    if (!el.classList.contains('open')) return;
    const tab = this.socialTab;
    const online = this.sim.socialInfo !== null;
    const realmTag = online && this.sim.realm ? ` <span class="soc-realm-tag">— ${esc(this.sim.realm)}</span>` : '';
    el.innerHTML = `<div class="panel-title"><span>Social${realmTag}</span><span class="x-btn" data-close>✕</span></div>`
      + `<div class="soc-tabs">`
      + `<div class="soc-tab ${tab === 'friends' ? 'on' : ''}" data-tab="friends">Friends</div>`
      + `<div class="soc-tab ${tab === 'guild' ? 'on' : ''}" data-tab="guild">Guild</div>`
      + `<div class="soc-tab ${tab === 'ignore' ? 'on' : ''}" data-tab="ignore">Ignore</div>`
      + `</div>`
      + `<div class="soc-body"></div>`
      + `<div class="soc-notice"></div>`
      + (online ? this.socialFooter() : '');
    this.wireSocialChrome(el);
    this.refreshSocialList();
    this.renderSocialNotice();
  }

  // Lighter refresh: just the list inside the current tab, leaving the footer
  // (and any half-typed name / open suggestions) untouched.
  private refreshSocialList(): void {
    const body = $('#social-window').querySelector('.soc-body') as HTMLElement | null;
    if (!body) return;
    const online = this.sim.socialInfo !== null;
    body.innerHTML = !online
      ? `<div class="soc-empty">Friends, guilds, and ignore lists are available in online play.</div>`
      : this.socialTab === 'friends' ? this.friendsHtml()
        : this.socialTab === 'guild' ? this.guildHtml()
          : this.ignoreHtml();
    this.wireSocialRows(body);
  }

  private friendsHtml(): string {
    const friends = this.sim.socialInfo?.friends ?? [];
    if (friends.length === 0) return `<div class="soc-empty">No friends yet. Search for someone by name below.</div>`;
    return friends.map((f) => {
      const dot = f.online ? (f.status ?? 'online') : 'off';
      const meta = f.online
        ? `<span class="zone">${esc(f.zone ?? '')}</span><br>${statusLabel(f.status)}`
        : 'Offline';
      const name = f.online
        ? `<span class="soc-name soc-link" data-whisper="${esc(f.name)}" title="Whisper ${esc(f.name)}">${esc(f.name)}</span>`
        : `<span class="soc-name">${esc(f.name)}</span>`;
      const whisper = f.online ? `<span class="soc-x" data-whisper="${esc(f.name)}" title="Whisper ${esc(f.name)}">✉</span>` : '';
      return `<div class="soc-row">`
        + `<span class="soc-dot ${dot === 'off' ? '' : dot}"></span>`
        + `<span>${name}<br><span class="soc-meta">Lvl ${f.level} ${cap(f.cls)}</span></span>`
        + `<span class="soc-meta">${meta}</span>`
        + `<span class="soc-actions">${whisper}<span class="soc-x" data-act="unfriend" data-name="${esc(f.name)}" title="Remove ${esc(f.name)} from friends">✕</span></span>`
        + `</div>`;
    }).join('');
  }

  private ignoreHtml(): string {
    const blocks = this.sim.socialInfo?.blocks ?? [];
    if (blocks.length === 0) return `<div class="soc-empty">Your ignore list is empty.</div>`;
    return blocks.map((b) => `<div class="soc-row">`
      + `<span class="soc-name">${esc(b.name)}</span>`
      + `<span class="soc-actions" style="margin-left:auto"><span class="soc-x" data-act="unblock" data-name="${esc(b.name)}" title="Stop ignoring ${esc(b.name)}">✕</span></span>`
      + `</div>`).join('');
  }

  private guildHtml(): string {
    const guild = this.sim.socialInfo?.guild ?? null;
    if (!guild) return `<div class="soc-empty">You are not in a guild. Found one below, or get invited by an existing guild.</div>`;
    const me = guild.rank;
    const head = `<div class="soc-guild-head">&lt;${esc(guild.name)}&gt; <span class="gm">— you are ${rankLabel(me)} &middot; ${guild.members.length} member${guild.members.length === 1 ? '' : 's'}</span></div>`;
    const rows = guild.members.map((m) => {
      const dot = m.online ? (m.status ?? 'online') : 'off';
      const meta = m.online ? `<span class="zone">${esc(m.zone ?? '')}</span>` : 'Offline';
      const self = m.name === this.sim.player.name;
      const nameInner = `${esc(m.name)}<span class="rank">${rankLabel(m.rank)}</span>`;
      const name = m.online && !self
        ? `<span class="soc-name soc-link" data-whisper="${esc(m.name)}" title="Whisper ${esc(m.name)}">${nameInner}</span>`
        : `<span class="soc-name">${nameInner}</span>`;
      let actions = m.online && !self ? `<span class="soc-x" data-whisper="${esc(m.name)}" title="Whisper ${esc(m.name)}">✉</span>` : '';
      if (!self && me === 'leader') actions += `<span class="soc-x" data-act="gtransfer" data-name="${esc(m.name)}" title="Make ${esc(m.name)} Guild Master">♛</span>`;
      if (!self && me === 'leader' && m.rank === 'member') actions += `<span class="soc-x" data-act="promote" data-name="${esc(m.name)}" title="Promote ${esc(m.name)} to officer">▲</span>`;
      if (!self && me === 'leader' && m.rank === 'officer') actions += `<span class="soc-x" data-act="demote" data-name="${esc(m.name)}" title="Demote ${esc(m.name)} to member">▼</span>`;
      // leaders may remove members + officers; officers may remove only members
      const canKick = !self && ((me === 'leader' && m.rank !== 'leader') || (me === 'officer' && m.rank === 'member'));
      if (canKick) actions += `<span class="soc-x" data-act="gkick" data-name="${esc(m.name)}" title="Remove ${esc(m.name)} from guild">✕</span>`;
      return `<div class="soc-row">`
        + `<span class="soc-dot ${dot === 'off' ? '' : dot}"></span>`
        + `<span>${name}<br><span class="soc-meta">Lvl ${m.level} ${cap(m.cls)}</span></span>`
        + `<span class="soc-meta">${meta}</span>`
        + (actions ? `<span class="soc-actions">${actions}</span>` : '')
        + `</div>`;
    }).join('');
    return head + rows;
  }

  // The add/action row changes with the tab (and guild membership). Inputs
  // tagged data-suggest get the username typeahead.
  private socialFooter(): string {
    if (this.socialTab === 'friends') return this.addRow('friend', 'friend-add', 'Search to add a friend…', 'Add', 16, true);
    if (this.socialTab === 'ignore') return this.addRow('ignore', 'block-add', 'Search to ignore…', 'Ignore', 16, true);
    const guild = this.sim.socialInfo?.guild ?? null;
    if (!guild) return this.addRow('gname', 'guild-create', 'Name your new guild', 'Found', 24, false);
    let foot = '';
    if (guild.rank !== 'member') foot += this.addRow('ginvite', 'guild-invite', 'Search to invite…', 'Invite', 16, true);
    // WoW: a Guild Master with other members can't just leave — they disband
    // (or hand over leadership via the ♛ action). Everyone else can leave.
    foot += guild.rank === 'leader' && guild.members.length > 1
      ? `<div class="soc-add soc-leave"><button class="btn" data-act="guild-disband">Disband Guild</button></div>`
      : `<div class="soc-add soc-leave"><button class="btn" data-act="guild-leave">Leave Guild</button></div>`;
    return foot;
  }

  private addRow(field: string, act: string, placeholder: string, label: string, maxlen: number, suggest: boolean): string {
    return `<div class="soc-add">`
      + (suggest ? `<div class="soc-suggest" data-for="${field}"></div>` : '')
      + `<input maxlength="${maxlen}" placeholder="${placeholder}" data-field="${field}"${suggest ? ' data-suggest="1"' : ''} autocomplete="off" spellcheck="false"/>`
      + `<button class="btn" data-act="${act}">${label}</button></div>`;
  }

  // Wire the parts that survive a content refresh: close, tabs, footer + search.
  private wireSocialChrome(el: HTMLElement): void {
    el.querySelector('[data-close]')?.addEventListener('click', () => this.toggleSocial());
    el.querySelectorAll('.soc-tab').forEach((t) => t.addEventListener('click', () => {
      this.socialTab = (t as HTMLElement).dataset.tab as 'friends' | 'guild' | 'ignore';
      this.socialNotice = null;
      this.lastSocialStruct = this.socialStructSig();
      this.renderSocial();
    }));
    const field = (sel: string): string => (el.querySelector(`input[data-field="${sel}"]`) as HTMLInputElement | null)?.value.trim() ?? '';
    const submit = (act: string | undefined): void => {
      if (act === 'friend-add') void this.socialResolveAndAct('friend', field('friend'));
      else if (act === 'block-add') void this.socialResolveAndAct('ignore', field('ignore'));
      else if (act === 'guild-invite') void this.socialResolveAndAct('ginvite', field('ginvite'));
      else if (act === 'guild-create') { const n = field('gname'); if (n) { this.sim.guildCreate(n); this.clearSocialInput('gname'); } }
      else if (act === 'guild-leave') this.sim.guildLeave();
      else if (act === 'guild-disband') this.showPrompt('Disband your guild? This cannot be undone.', 'Disband', () => this.sim.guildDisband(), () => { /* keep */ });
    };
    el.querySelectorAll('.soc-add .btn').forEach((b) => b.addEventListener('click', () => submit((b as HTMLElement).dataset.act)));
    // Enter-to-submit only for plain inputs (the guild name). Search inputs get
    // richer keyboard handling — arrows + Enter to pick a suggestion — below.
    el.querySelectorAll('.soc-add input:not([data-suggest])').forEach((inp) => inp.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key !== 'Enter') return;
      submit((inp.parentElement?.querySelector('.btn') as HTMLElement | null)?.dataset.act);
    }));
    this.wireSuggest(el);
  }

  // Wire per-row actions (re-run on every list refresh).
  private wireSocialRows(scope: HTMLElement): void {
    scope.querySelectorAll('.soc-x').forEach((x) => x.addEventListener('click', () => {
      const act = (x as HTMLElement).dataset.act;
      const name = (x as HTMLElement).dataset.name ?? '';
      if (act === 'unfriend') this.sim.friendRemove(name);
      else if (act === 'unblock') this.sim.blockRemove(name);
      else if (act === 'gkick') this.sim.guildKick(name);
      else if (act === 'promote') this.sim.guildPromote(name);
      else if (act === 'demote') this.sim.guildDemote(name);
      else if (act === 'gtransfer') this.showPrompt(`Make <b>${esc(name)}</b> the Guild Master? You will step down to Officer.`, 'Promote', () => this.sim.guildTransfer(name), () => { /* keep */ });
    }));
    scope.querySelectorAll('[data-whisper]').forEach((w) => w.addEventListener('click', () => {
      this.startWhisper((w as HTMLElement).dataset.whisper ?? '');
    }));
  }

  private suggestKind(field: string): 'friend' | 'ignore' | 'ginvite' {
    return field === 'friend' ? 'friend' : field === 'ignore' ? 'ignore' : 'ginvite';
  }

  // Username typeahead: debounced search against same-realm characters, with
  // arrow-key navigation and Enter to pick the highlighted name.
  private wireSuggest(el: HTMLElement): void {
    el.querySelectorAll('input[data-suggest]').forEach((node) => {
      const input = node as HTMLInputElement;
      const field = input.dataset.field ?? '';
      input.addEventListener('input', () => {
        const q = input.value.trim();
        window.clearTimeout(this.socialSuggestTimer);
        if (!q) { this.renderSuggest(field, []); return; }
        this.socialSuggestTimer = window.setTimeout(async () => {
          const results = await this.sim.searchCharacters(q);
          this.renderSuggest(field, results.filter((r) => r.name !== this.sim.player.name).slice(0, 8));
        }, 160);
      });
      input.addEventListener('keydown', (e) => {
        const ke = e as KeyboardEvent;
        const open = this.socialSuggest.field === field && this.socialSuggest.items.length > 0;
        if (ke.key === 'ArrowDown' && open) { ke.preventDefault(); this.moveSuggest(field, 1); }
        else if (ke.key === 'ArrowUp' && open) { ke.preventDefault(); this.moveSuggest(field, -1); }
        else if (ke.key === 'Escape' && open) { ke.preventDefault(); this.renderSuggest(field, []); }
        else if (ke.key === 'Enter') {
          ke.preventDefault();
          const picked = open && this.socialSuggest.index >= 0 ? this.socialSuggest.items[this.socialSuggest.index].name : input.value;
          void this.socialResolveAndAct(this.suggestKind(field), picked);
        }
      });
      // let a suggestion's mousedown fire before blur clears the list
      input.addEventListener('blur', () => window.setTimeout(() => this.renderSuggest(field, []), 150));
    });
  }

  private renderSuggest(field: string, results: { name: string; cls: string; level: number }[]): void {
    const box = $('#social-window').querySelector(`.soc-suggest[data-for="${field}"]`) as HTMLElement | null;
    if (!box) return;
    this.socialSuggest = { field, items: results, index: -1 };
    if (results.length === 0) { box.style.display = 'none'; box.innerHTML = ''; return; }
    const kind = this.suggestKind(field);
    box.innerHTML = results.map((r, i) =>
      `<div class="soc-sugg-item" data-i="${i}" data-name="${esc(r.name)}"><span class="soc-name">${esc(r.name)}</span><span class="soc-meta">Lvl ${r.level} ${cap(r.cls)}</span></div>`).join('');
    box.style.display = 'block';
    box.querySelectorAll('.soc-sugg-item').forEach((it) => {
      it.addEventListener('mousedown', (e) => {
        e.preventDefault();
        void this.socialResolveAndAct(kind, (it as HTMLElement).dataset.name ?? '');
      });
      it.addEventListener('mousemove', () => { this.socialSuggest.index = Number((it as HTMLElement).dataset.i); this.highlightSuggest(field); });
    });
  }

  private moveSuggest(field: string, delta: number): void {
    const n = this.socialSuggest.items.length;
    if (n === 0) return;
    // start at the top when nothing is highlighted yet, then wrap
    this.socialSuggest.index = this.socialSuggest.index < 0
      ? (delta > 0 ? 0 : n - 1)
      : (this.socialSuggest.index + delta + n) % n;
    this.highlightSuggest(field);
  }

  private highlightSuggest(field: string): void {
    const box = $('#social-window').querySelector(`.soc-suggest[data-for="${field}"]`) as HTMLElement | null;
    if (!box) return;
    box.querySelectorAll('.soc-sugg-item').forEach((it) => {
      const on = Number((it as HTMLElement).dataset.i) === this.socialSuggest.index;
      it.classList.toggle('active', on);
      if (on) (it as HTMLElement).scrollIntoView({ block: 'nearest' });
    });
  }

  // Authoritative existence check (realm-scoped) before acting, so we can give
  // clear inline "no such player" feedback instead of a silent failure.
  private async socialResolveAndAct(kind: 'friend' | 'ignore' | 'ginvite', rawName: string): Promise<void> {
    const name = rawName.trim();
    if (!name) return;
    const results = await this.sim.searchCharacters(name);
    const exact = results.find((r) => r.name.toLowerCase() === name.toLowerCase());
    if (!exact) {
      this.setSocialNotice(`No player named “${name}” on ${this.sim.realm || 'this realm'}.`, true);
      return;
    }
    if (exact.name === this.sim.player.name) { this.setSocialNotice('That is you!', true); return; }
    if (kind === 'friend') { this.sim.friendAdd(exact.name); this.setSocialNotice(`Added ${exact.name} to your friends.`, false); this.clearSocialInput('friend'); }
    else if (kind === 'ignore') { this.sim.blockAdd(exact.name); this.setSocialNotice(`Now ignoring ${exact.name}.`, false); this.clearSocialInput('ignore'); }
    else { this.sim.guildInvite(exact.name); this.setSocialNotice(`Invited ${exact.name} to your guild.`, false); this.clearSocialInput('ginvite'); }
    this.renderSuggest(kind, []);
  }

  private clearSocialInput(field: string): void {
    const inp = $('#social-window').querySelector(`input[data-field="${field}"]`) as HTMLInputElement | null;
    if (inp) inp.value = '';
  }

  private setSocialNotice(text: string, error: boolean): void {
    this.socialNotice = { text, error };
    this.renderSocialNotice();
  }

  private renderSocialNotice(): void {
    const box = $('#social-window').querySelector('.soc-notice') as HTMLElement | null;
    if (!box) return;
    if (!this.socialNotice) { box.style.display = 'none'; box.textContent = ''; return; }
    box.textContent = this.socialNotice.text;
    box.className = 'soc-notice' + (this.socialNotice.error ? ' err' : ' ok');
    box.style.display = 'block';
  }

  // Open the chat bar pre-filled with a whisper to this player (WoW-style DM).
  private startWhisper(name: string): void {
    if (!name || name === this.sim.player.name) return;
    const input = $('#chat-input') as unknown as HTMLInputElement;
    input.value = `/w ${name} `;
    input.style.display = 'block';
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  // -------------------------------------------------------------------------
  // Prompts (party invite / trade request / duel challenge)
  // -------------------------------------------------------------------------

  private showPrompt(text: string, acceptLabel: string, onAccept: () => void, onDecline: () => void): void {
    const stack = $('#prompt-stack');
    const prompt = document.createElement('div');
    prompt.className = 'prompt panel';
    prompt.innerHTML = `<div class="prompt-text">${text}</div>`;
    const accept = document.createElement('button');
    accept.className = 'btn';
    accept.textContent = acceptLabel;
    const decline = document.createElement('button');
    decline.className = 'btn';
    decline.textContent = t('hud.prompts.decline');
    accept.addEventListener('click', () => { prompt.remove(); onAccept(); });
    decline.addEventListener('click', () => { prompt.remove(); onDecline(); });
    prompt.append(accept, decline);
    stack.appendChild(prompt);
    window.setTimeout(() => { if (prompt.isConnected) { prompt.remove(); onDecline(); } }, 28000);
  }

  // -------------------------------------------------------------------------
  // Trade window
  // -------------------------------------------------------------------------

  get tradeOpen(): boolean {
    return this.sim.tradeInfo !== null;
  }

  addItemToTrade(itemId: string): void {
    if (!this.tradeOpen || this.stagedTrade.items.length >= 6) return;
    const existing = this.stagedTrade.items.find((s) => s.itemId === itemId);
    const have = this.sim.inventory.find((s) => s.itemId === itemId)?.count ?? 0;
    if (existing) {
      if (existing.count < have) existing.count++;
    } else {
      this.stagedTrade.items.push({ itemId, count: 1 });
    }
    this.pushTradeOffer();
  }

  private pushTradeOffer(): void {
    this.sim.tradeSetOffer(this.stagedTrade.items, this.stagedTrade.copper);
  }

  private updateTradeWindow(): void {
    const el = $('#trade-window');
    const info = this.sim.tradeInfo;
    if (!info) {
      if (this.tradeWasOpen) {
        el.style.display = 'none';
        this.tradeWasOpen = false;
        this.stagedTrade = { items: [], copper: 0 };
        this.lastTradeSig = '';
      }
      return;
    }
    if (!this.tradeWasOpen) {
      this.tradeWasOpen = true;
      this.stagedTrade = { items: [], copper: 0 };
      this.renderBags();
      $('#bags').style.display = 'block';
    }
    const sig = JSON.stringify([info.myOffer, info.theirOffer, info.myAccepted, info.theirAccepted, this.stagedTrade]);
    if (sig === this.lastTradeSig) return;
    this.lastTradeSig = sig;

    const itemRow = (s: InvSlot, mine: boolean) => {
      const item = ITEMS[s.itemId];
      return `<div class="trade-item${mine ? ' mine' : ''}" data-item="${mine ? s.itemId : ''}">${this.itemIcon(item)}<span>${item?.name ?? s.itemId}${s.count > 1 ? ' x' + s.count : ''}</span></div>`;
    };
    el.innerHTML = `
      <div class="panel-title"><span>Trade with ${info.otherName}</span><span class="x-btn" data-close>✕</span></div>
      <div class="trade-cols">
        <div class="trade-col ${info.myAccepted ? 'accepted' : ''}">
          <h4>Your offer</h4>
          <div class="trade-items">${info.myOffer.items.map((s) => itemRow(s, true)).join('') || '<div style="color:#665c40;font-size:11px;padding:4px">Click items in your bags to add them</div>'}</div>
          <div class="trade-money">Money: <input id="trade-copper" type="number" min="0" value="${this.stagedTrade.copper}" /> copper</div>
        </div>
        <div class="trade-col ${info.theirAccepted ? 'accepted' : ''}">
          <h4>${info.otherName}'s offer</h4>
          <div class="trade-items">${info.theirOffer.items.map((s) => itemRow(s, false)).join('') || '<div style="color:#665c40;font-size:11px;padding:4px">Nothing offered yet</div>'}</div>
          <div class="trade-money">Money: <span class="gold">${formatLocalizedMoney(info.theirOffer.copper)}</span></div>
        </div>
      </div>
      <div class="trade-hint">Click an offered item to remove it. Both sides must press Accept Trade.</div>`;
    const acceptBtn = document.createElement('button');
    acceptBtn.className = 'btn';
    acceptBtn.textContent = info.myAccepted ? 'Waiting…' : 'Accept Trade';
    acceptBtn.disabled = info.myAccepted;
    acceptBtn.addEventListener('click', () => this.sim.tradeConfirm());
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => this.sim.tradeCancel());
    el.append(acceptBtn, cancelBtn);
    el.querySelector('[data-close]')?.addEventListener('click', () => this.sim.tradeCancel());
    el.querySelectorAll('.trade-item.mine').forEach((row) => {
      row.addEventListener('click', () => {
        const itemId = (row as HTMLElement).dataset.item!;
        const idx = this.stagedTrade.items.findIndex((s) => s.itemId === itemId);
        if (idx >= 0) {
          this.stagedTrade.items[idx].count--;
          if (this.stagedTrade.items[idx].count <= 0) this.stagedTrade.items.splice(idx, 1);
          this.pushTradeOffer();
        }
      });
    });
    const copperInput = el.querySelector('#trade-copper') as HTMLInputElement;
    copperInput?.addEventListener('change', () => {
      this.stagedTrade.copper = Math.max(0, Math.floor(Number(copperInput.value) || 0));
      this.pushTradeOffer();
    });
    el.style.display = 'block';
  }

  // -------------------------------------------------------------------------
  // Options menu (Esc) + hotkey rebinding
  // -------------------------------------------------------------------------

  attachOptions(hooks: OptionsHooks): void {
    this.optionsHooks = hooks;
  }

  attachReporting(hooks: ReportHooks): void {
    this.reportHooks = hooks;
  }

  get optionsOpen(): boolean {
    return $('#options-menu').style.display === 'block';
  }

  // True while a menu that should pause character movement is up.
  isModalOpen(): boolean {
    return this.optionsOpen;
  }

  toggleOptionsMenu(): void {
    if (this.optionsOpen) { this.closeOptions(); return; }
    this.optionsView = 'main';
    this.capturingKey = null;
    this.keybindNote = '';
    this.renderOptions();
    $('#options-menu').style.display = 'block';
    audio.click();
  }

  closeOptions(): void {
    $('#options-menu').style.display = 'none';
    this.capturingKey = null;
    this.hideTooltip();
  }

  private renderOptions(): void {
    if (this.optionsView === 'keybinds') { this.renderKeybinds(); return; }
    if (this.optionsView === 'graphics') { this.renderGraphics(); return; }
    if (this.optionsView === 'audio') { this.renderAudio(); return; }
    const el = $('#options-menu');
    el.innerHTML = `<div class="panel-title"><span>${esc(t('hud.options.gameMenu'))}</span><span class="x-btn" data-close>✕</span></div>`;
    const list = document.createElement('div');
    list.className = 'opt-list';
    const add = (text: string, onClick: () => void) => {
      const b = document.createElement('button');
      b.className = 'btn opt-btn';
      b.textContent = text;
      b.addEventListener('click', () => { audio.click(); onClick(); });
      list.appendChild(b);
    };
    const goto = (view: 'keybinds' | 'graphics' | 'audio') => { this.optionsView = view; this.keybindNote = ''; this.renderOptions(); };
    add(t('hud.options.keyBindings'), () => goto('keybinds'));
    add(t('hud.options.graphics'), () => goto('graphics'));
    add(t('hud.options.audio'), () => goto('audio'));
    add(t('hud.options.logout'), () => this.optionsHooks?.logout());
    add(t('hud.options.returnToGame'), () => this.closeOptions());
    el.appendChild(list);
    el.querySelector('[data-close]')?.addEventListener('click', () => this.closeOptions());
  }

  // A labelled slider bound to a numeric setting; live-applies via the hook.
  private settingSlider(parent: HTMLElement, label: string, key: keyof GameSettings): void {
    const hooks = this.optionsHooks;
    if (!hooks) return;
    const r = SETTING_RANGES[key];
    const row = document.createElement('div');
    row.className = 'set-row';
    const name = document.createElement('span');
    name.className = 'set-name';
    name.textContent = label;
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'set-slider';
    slider.min = String(r.min);
    slider.max = String(r.max);
    slider.step = '0.05';
    slider.value = String(hooks.settings.get(key));
    slider.setAttribute('aria-label', label);
    const val = document.createElement('span');
    val.className = 'set-val';
    const pct = () => `${Math.round(hooks.settings.get(key) * 100)}%`;
    val.textContent = pct();
    slider.addEventListener('input', () => {
      hooks.onSettingChange(key, Number(slider.value));
      val.textContent = pct();
    });
    row.append(name, slider, val);
    parent.appendChild(row);
  }

  private settingToggle(parent: HTMLElement, label: string, key: keyof GameSettings): void {
    const hooks = this.optionsHooks;
    if (!hooks) return;
    const row = document.createElement('div');
    row.className = 'set-row';
    const name = document.createElement('span');
    name.className = 'set-name';
    name.textContent = label;
    const toggle = document.createElement('button');
    toggle.className = 'btn set-toggle';
    const sync = () => {
      const on = hooks.settings.get(key) >= 0.5;
      toggle.textContent = on ? t('hud.options.on') : t('hud.options.off');
      toggle.classList.toggle('off', !on);
      toggle.setAttribute('aria-pressed', String(on));
      toggle.setAttribute('aria-label', label);
    };
    sync();
    toggle.addEventListener('click', () => {
      audio.click();
      const next = hooks.settings.get(key) >= 0.5 ? 0 : 1;
      hooks.onSettingChange(key, next);
      sync();
    });
    row.append(name, toggle);
    parent.appendChild(row);
  }

  private settingsViewShell(title: string): HTMLElement {
    const el = $('#options-menu');
    el.innerHTML = `<div class="panel-title"><span>${esc(title)}</span><span class="x-btn" data-close>✕</span></div>`;
    const body = document.createElement('div');
    body.className = 'set-rows';
    el.appendChild(body);
    return body;
  }

  private settingsViewFooter(): void {
    const el = $('#options-menu');
    const reset = document.createElement('button');
    reset.className = 'btn';
    reset.textContent = t('hud.options.resetToDefaults');
    reset.addEventListener('click', () => {
      audio.click();
      this.optionsHooks?.settings.reset();
      // re-apply every setting to its subsystem, then redraw the view
      const all = this.optionsHooks?.settings.all();
      if (all) for (const k of Object.keys(all) as (keyof GameSettings)[]) this.optionsHooks?.onSettingChange(k, all[k]);
      this.renderOptions();
    });
    const back = document.createElement('button');
    back.className = 'btn';
    back.textContent = t('hud.options.back');
    back.addEventListener('click', () => { audio.click(); this.optionsView = 'main'; this.renderOptions(); });
    el.append(reset, back);
    el.querySelector('[data-close]')?.addEventListener('click', () => this.closeOptions());
  }

  private renderGraphics(): void {
    const body = this.settingsViewShell(t('hud.options.graphics'));
    this.settingSlider(body, t('hud.options.cameraSpeed'), 'cameraSpeed');
    this.settingSlider(body, t('hud.options.brightness'), 'brightness');
    this.settingSlider(body, t('hud.options.renderQuality'), 'renderScale');
    this.settingToggle(body, t('hud.options.fullscreen'), 'fullscreen');
    const note = document.createElement('div');
    note.className = 'set-note';
    note.textContent = t('hud.options.graphicsNote');
    $('#options-menu').appendChild(note);
    this.settingsViewFooter();
  }

  private renderAudio(): void {
    const body = this.settingsViewShell(t('hud.options.audio'));
    this.settingSlider(body, t('hud.options.soundEffects'), 'sfxVolume');
    this.settingSlider(body, t('hud.options.musicVolume'), 'musicVolume');
    const row = document.createElement('div');
    row.className = 'set-row';
    const name = document.createElement('span');
    name.className = 'set-name';
    name.textContent = t('hud.options.music');
    const toggle = document.createElement('button');
    toggle.className = 'btn set-toggle';
    const sync = () => {
      toggle.textContent = music.enabled ? t('hud.options.on') : t('hud.options.off');
      toggle.classList.toggle('off', !music.enabled);
      toggle.setAttribute('aria-pressed', String(music.enabled));
      toggle.setAttribute('aria-label', t('hud.options.music'));
    };
    sync();
    toggle.addEventListener('click', () => { audio.click(); music.setEnabled(!music.enabled); sync(); });
    row.append(name, toggle);
    body.appendChild(row);
    this.settingsViewFooter();
  }

  // Display name for an action row. Action-bar slots show the ability that
  // currently occupies them (slot 0 is always Attack); everything else uses
  // its registry label.
  private actionDisplayName(actionId: string, fallback: string): string {
    if (!actionId.startsWith('slot')) return BIND_ACTION_LABEL_KEYS[actionId] ? t(BIND_ACTION_LABEL_KEYS[actionId]) : fallback;
    const slot = Number(actionId.slice(4));
    if (slot === 0) return t('hud.keybinds.actions.attack');
    const known = this.abilityForSlot(slot);
    return known ? abilityDisplayName(known.def) : t('hud.keybinds.actions.actionBarSlot', { slot: slot + 1 });
  }

  private renderKeybinds(): void {
    const el = $('#options-menu');
    el.innerHTML = `<div class="panel-title"><span>${esc(t('hud.options.keyBindings'))}</span><span class="x-btn" data-close>✕</span></div>`;
    const note = document.createElement('div');
    note.className = 'kb-note';
    note.textContent = this.keybindNote || t('hud.options.keybindHelp');
    el.appendChild(note);
    const rows = document.createElement('div');
    rows.className = 'kb-rows';
    for (const category of BIND_CATEGORIES) {
      const header = document.createElement('div');
      header.className = 'kb-cat';
      header.textContent = BIND_CATEGORY_LABEL_KEYS[category] ? t(BIND_CATEGORY_LABEL_KEYS[category]) : category;
      rows.appendChild(header);
      for (const action of BIND_ACTIONS.filter((a) => a.category === category)) {
        const row = document.createElement('div');
        row.className = 'kb-row';
        const name = document.createElement('span');
        name.className = 'kb-name';
        name.textContent = this.actionDisplayName(action.id, action.label);
        row.appendChild(name);
        for (let index = 0; index < 2; index++) {
          const capturing = this.capturingKey?.action === action.id && this.capturingKey?.index === index;
          const key = document.createElement('button');
          key.className = 'btn kb-key' + (capturing ? ' capturing' : '');
          key.textContent = capturing ? '...' : (this.keybinds.labelAt(action.id, index) || t('hud.options.unbound'));
          key.title = index === 0 ? t('hud.options.primary') : t('hud.options.alternate');
          key.setAttribute('aria-label', `${this.actionDisplayName(action.id, action.label)} ${key.title}`);
          key.addEventListener('click', () => this.beginCapture(action.id, index, action.label));
          row.appendChild(key);
        }
        rows.appendChild(row);
      }
    }
    el.appendChild(rows);
    const reset = document.createElement('button');
    reset.className = 'btn';
    reset.textContent = t('hud.options.resetToDefaults');
    reset.addEventListener('click', () => {
      audio.click();
      this.keybinds.reset();
      this.capturingKey = null;
      this.keybindNote = t('hud.options.keybindReset');
      this.refreshKeybindLabels();
      this.renderKeybinds();
    });
    const back = document.createElement('button');
    back.className = 'btn';
    back.textContent = t('hud.options.back');
    back.addEventListener('click', () => { audio.click(); this.optionsView = 'main'; this.capturingKey = null; this.renderOptions(); });
    el.append(reset, back);
    el.querySelector('[data-close]')?.addEventListener('click', () => this.closeOptions());
  }

  private beginCapture(actionId: string, index: number, fallbackLabel: string): void {
    if (!this.optionsHooks) return;
    const name = this.actionDisplayName(actionId, fallbackLabel);
    this.capturingKey = { action: actionId, index };
    this.keybindNote = t('hud.options.keybindCapture', { action: name });
    this.renderKeybinds();
    this.optionsHooks.captureKey((code) => {
      this.capturingKey = null;
      if (code === null) {
        this.keybindNote = t('hud.options.keybindCancelled');
      } else if (isReservedCode(code)) {
        this.keybindNote = t('hud.options.keybindReserved', { key: keyLabel(code) });
      } else if (this.keybinds.bind(actionId, index, code)) {
        this.keybindNote = t('hud.options.keybindBound', { action: name, key: keyLabel(code) });
        this.refreshKeybindLabels();
      }
      // re-render only if the menu is still open (player may have closed it)
      if (this.optionsOpen) this.renderKeybinds();
    });
  }

  // -------------------------------------------------------------------------

  // Closes the topmost UI. Returns true if something was closed.
  closeAll(): boolean {
    let closed = false;
    this.closeContextMenu();
    if (this.optionsOpen) { this.closeOptions(); return true; }
    const socialEl = $('#social-window');
    if (socialEl.classList.contains('open')) { socialEl.classList.remove('open'); closed = true; }
    if (this.tradeOpen) {
      this.sim.tradeCancel();
      closed = true;
    }
    if (this.marketOpen) { this.closeMarket(); closed = true; }
    if ($('#quest-dialog').style.display === 'block') { this.closeQuestDialog(); closed = true; }
    if ($('#quest-log-window').style.display === 'block') { this.closeQuestLog(); closed = true; }
    for (const id of ['#loot-window', '#vendor-window', '#bags', '#char-window', '#spellbook', '#map-window', '#report-window', '#arena-window']) {
      const el = $(id);
      if (el.style.display === 'block') {
        el.style.display = 'none';
        closed = true;
      }
    }
    if (closed) {
      this.openLootMobId = null;
      this.openVendorNpcId = null;
      this.hideTooltip();
    }
    return closed;
  }
}

function describeAbilitySummary(known: ResolvedAbility, resourceType: ResourceType | null): string {
  const parts: string[] = [];
  if (known.cost > 0) {
    parts.push(t('abilityUi.tooltip.cost', {
      cost: formatAbilityNumber(known.cost),
      resource: resourceDisplayName(resourceType),
    }));
  }
  parts.push(abilityCastLine(known));
  if (known.def.cooldown > 0) {
    parts.push(t('abilityUi.tooltip.cooldownSeconds', { seconds: formatAbilityNumber(known.def.cooldown) }));
  }
  return parts.join(' · ');
}

function abilityDisplayName(def: AbilityDef): string {
  return def.name;
}

function abilityDisplayDescription(def: AbilityDef, damageText: string): string {
  return def.description.replace('$d', damageText);
}

function classDisplayName(cls: PlayerClass): string {
  return t(CLASS_NAME_KEYS[cls]);
}

function resourceDisplayName(resourceType: ResourceType | null): string {
  return t(RESOURCE_LABEL_KEYS[resourceType ?? 'mana']);
}

function itemSlotName(slot: EquipSlot): string {
  return t(ITEM_SLOT_LABEL_KEYS[slot]);
}

function itemQualityLabel(quality: ItemDef['quality']): string {
  return t(ITEM_QUALITY_LABEL_KEYS[quality ?? 'common']);
}

function itemKindLabel(kind: ItemDef['kind']): string {
  return t(ITEM_KIND_LABEL_KEYS[kind]);
}

function itemStatName(stat: string): string {
  const key = ITEM_STAT_LABEL_KEYS[stat as keyof Stats];
  return key ? t(key) : cap(stat);
}

function itemNumber(value: number, fractionDigits = 0): string {
  return formatNumber(value, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
}

function parseSimMoney(text: string): number | null {
  let copper = 0;
  let matched = false;
  for (const match of text.matchAll(/(\d+)\s*([gsc])/gi)) {
    matched = true;
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (unit === 'g') copper += amount * 10000;
    else if (unit === 's') copper += amount * 100;
    else copper += amount;
  }
  return matched ? copper : null;
}

function formatAbilityNumber(value: number): string {
  return formatNumber(value, { maximumFractionDigits: 1 });
}

function abilityRangeLine(def: AbilityDef): string | null {
  if (def.range <= 0) return null;
  if (def.minRange !== undefined) {
    return t('abilityUi.tooltip.rangeWithMin', {
      min: formatAbilityNumber(def.minRange),
      max: formatAbilityNumber(def.range),
    });
  }
  return t('abilityUi.tooltip.range', { range: formatAbilityNumber(def.range) });
}

function abilityCastLine(known: ResolvedAbility): string {
  if (known.def.channel) {
    return t('abilityUi.tooltip.channeledSeconds', { seconds: formatAbilityNumber(known.def.channel.duration) });
  }
  if (known.castTime > 0) {
    return t('abilityUi.tooltip.castSeconds', { seconds: formatAbilityNumber(known.castTime) });
  }
  return t('abilityUi.tooltip.instant');
}

function abilityRequirementLines(def: AbilityDef): string[] {
  const lines: string[] = [];
  if (def.requiresForm) lines.push(t('abilityUi.tooltip.requiresForm', { form: t(FORM_LABEL_KEYS[def.requiresForm]) }));
  if (def.requiresStealth) lines.push(t('abilityUi.tooltip.requiresStealth'));
  if (def.spendsCombo) lines.push(t('abilityUi.tooltip.requiresCombo'));
  if (def.requiresDodgeProc) lines.push(t('abilityUi.tooltip.requiresDodge'));
  if (def.requiresOutOfCombat) lines.push(t('abilityUi.tooltip.requiresOutOfCombat'));
  if (def.requiresTargetHpBelow !== undefined) {
    lines.push(t('abilityUi.tooltip.requiresTargetHealthBelow', { percent: formatAbilityNumber(def.requiresTargetHpBelow * 100) }));
  }
  if (def.onNextSwing) lines.push(t('abilityUi.tooltip.onNextSwing'));
  if (def.offGcd) lines.push(t('abilityUi.tooltip.offGlobalCooldown'));
  if (def.targetType === 'friendly') lines.push(t('abilityUi.tooltip.friendlyTarget'));
  else if (def.requiresTarget) lines.push(t('abilityUi.tooltip.enemyTarget'));
  return lines;
}

function abilityEffectText(effects: AbilityEffect[]): string {
  const primary = effects.find((eff) =>
    eff.type === 'directDamage' ||
    eff.type === 'heal' ||
    eff.type === 'weaponDamage' ||
    eff.type === 'weaponStrike' ||
    eff.type === 'aoeDamage' ||
    eff.type === 'aoeRoot' ||
    eff.type === 'finisherDamage' ||
    eff.type === 'drainTick'
  );
  if (primary) {
    switch (primary.type) {
      case 'directDamage':
      case 'heal':
      case 'aoeDamage':
      case 'aoeRoot':
      case 'drainTick':
        return abilityAmountRange(primary.min, primary.max);
      case 'weaponDamage':
      case 'weaponStrike':
        return formatAbilityNumber(primary.bonus);
      case 'finisherDamage':
        return t('abilityUi.tooltip.finisherDamage', {
          base: formatAbilityNumber(primary.base),
          perCombo: formatAbilityNumber(primary.perCombo),
        });
    }
  }

  const secondary = effects.find((eff) =>
    eff.type === 'dot' ||
    eff.type === 'hot' ||
    eff.type === 'absorb' ||
    eff.type === 'imbue'
  );
  if (!secondary) return '';
  switch (secondary.type) {
    case 'dot':
    case 'hot':
      return formatAbilityNumber(secondary.total);
    case 'absorb':
      return formatAbilityNumber(secondary.amount);
    case 'imbue':
      return formatAbilityNumber(secondary.bonus);
    default:
      return '';
  }
}

function abilityAmountRange(min: number, max: number): string {
  if (min === max) return formatAbilityNumber(min);
  return t('abilityUi.tooltip.damageRange', {
    min: formatAbilityNumber(min),
    max: formatAbilityNumber(max),
  });
}

function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function statusLabel(status: string | undefined): string {
  switch (status) {
    case 'combat': return 'In Combat';
    case 'dungeon': return 'In Dungeon';
    case 'dead': return 'Dead';
    default: return 'Online';
  }
}

function rankLabel(rank: string): string {
  return rank === 'leader' ? 'Guild Master' : rank === 'officer' ? 'Officer' : 'Member';
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt >= 0) {
    r = Math.round(r + (255 - r) * amt);
    g = Math.round(g + (255 - g) * amt);
    b = Math.round(b + (255 - b) * amt);
  } else {
    r = Math.round(r * (1 + amt));
    g = Math.round(g * (1 + amt));
    b = Math.round(b * (1 + amt));
  }
  return `rgb(${r},${g},${b})`;
}
