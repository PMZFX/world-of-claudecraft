import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  en,
  es,
  es_ES,
  fr_FR,
  fr_CA,
  en_CA,
  it_IT,
  de_DE,
  zh_CN,
  zh_TW,
  ko_KR,
  ja_JP,
  pt_BR,
  ru_RU,
  formatDateTime,
  formatMoney,
  formatNumber,
  isSupportedLanguage,
  languageTag,
  setLanguage,
  supportedLanguages,
  t,
  type TranslationKey,
} from "../src/ui/i18n";
import { ABILITIES, CLASSES, ITEMS, MOBS, NPCS, QUESTS } from "../src/sim/data";
import {
  assertEntityTranslationsReady,
  entityTranslationFallbackLog,
  entityTranslationKey,
  entityTranslationManifest,
  missingEntityTranslationsForPhases,
  resetEntityTranslationFallbackLog,
  tEntity,
} from "../src/ui/entity_i18n";
import type { PlayerClass } from "../src/sim/types";

const locales: Record<string, typeof en> = {
  es,
  es_ES,
  fr_FR,
  fr_CA,
  en_CA,
  it_IT,
  de_DE,
  zh_CN,
  zh_TW,
  ko_KR,
  ja_JP,
  pt_BR,
  ru_RU,
};

describe("i18n Localization Key Coverage", () => {
  const placeholderPattern = /\b(TODO|TBD|FIXME|PLACEHOLDER|TRANSLATE|LOREM)\b/i;
  const phaseOneShellKeys: TranslationKey[] = [
    "seo.title",
    "seo.description",
    "a11y.goHome",
    "loading.worldProgress",
    "errors.characterNameInvalid",
    "realm.onlineNow",
    "character.levelClass",
    "deleteCharacter.body",
    "classDetails.sections.startingStats",
    "mobilePreflight.title",
    "serverUnavailable.heading",
  ];
  const phaseTwoHudKeys: TranslationKey[] = [
    "hud.core.chatPlaceholder",
    "hud.core.xpGain",
    "hud.options.gameMenu",
    "hud.options.keybindHelp",
    "hud.options.unbound",
    "hud.keybinds.categories.movement",
    "hud.keybinds.actions.forward",
    "hud.meters.noCombat",
    "hud.chat.templates.guild",
    "hud.chat.context.trade",
    "hud.report.reasons.offensiveNameOrChat",
    "hud.prompts.duelRequest",
    "hud.combat.damageDoneCrit",
    "hud.system.arenaVictoryLog",
    "hud.errors.chatCooldown",
    "hud.logs.lootReceiveItem",
  ];
  const phaseThreeAbilityKeys: TranslationKey[] = [
    "abilityUi.actionBar.attackName",
    "abilityUi.actionBar.attackTooltip",
    "abilityUi.actionBar.emptySlot",
    "abilityUi.spellbook.title",
    "abilityUi.spellbook.classSubtitle",
    "abilityUi.spellbook.trainableAtLevel",
    "abilityUi.spellbook.learnAtLevel",
    "abilityUi.tooltip.rank",
    "abilityUi.tooltip.cost",
    "abilityUi.tooltip.rangeWithMin",
    "abilityUi.tooltip.channeledSeconds",
    "abilityUi.tooltip.cooldownSeconds",
    "abilityUi.tooltip.requiresForm",
    "abilityUi.tooltip.requiresCombo",
    "abilityUi.tooltip.finisherDamage",
    "abilityUi.resources.mana",
  ];
  const phaseFourQuestKeys: TranslationKey[] = [
    "questUi.tracker.title",
    "questUi.tracker.complete",
    "questUi.log.title",
    "questUi.log.summary",
    "questUi.log.emptyTitle",
    "questUi.log.emptyHint",
    "questUi.log.returnTo",
    "questUi.log.abandon",
    "questUi.dialog.accept",
    "questUi.dialog.completeQuest",
    "questUi.dialog.back",
    "questUi.dialog.availableQuestAria",
    "questUi.detail.objectives",
    "questUi.detail.rewards",
    "questUi.detail.xpReward",
    "questUi.detail.objectiveProgress",
    "questUi.logs.accepted",
    "questUi.errors.unavailable",
  ];
  const phaseFiveItemKeys: TranslationKey[] = [
    "itemUi.money.goldShort",
    "itemUi.money.copper",
    "itemUi.slots.mainhand",
    "itemUi.quality.rare",
    "itemUi.kind.quest",
    "itemUi.stats.attackPower",
    "itemUi.tooltip.damageSpeed",
    "itemUi.tooltip.useFood",
    "itemUi.tooltip.sellPrice",
    "itemUi.bags.title",
    "itemUi.bags.itemAria",
    "itemUi.equipment.levelClass",
    "itemUi.vendor.goodsTitle",
    "itemUi.vendor.buyAria",
    "itemUi.market.title",
    "itemUi.market.sellNote",
    "itemUi.market.buyAria",
    "itemUi.logs.sellerSold",
    "itemUi.errors.tooManyListings",
  ];
  const interpolationValues: Record<string, string | number> = {
    active: 3,
    ability: "Fireball",
    action: "Open Chat",
    amount: 42,
    base: 14,
    buyer: "Mira",
    classes: "Warrior, Mage",
    className: "Mage",
    command: "/dance",
    completed: 12,
    count: 5,
    cost: 30,
    current: 120,
    cut: 5,
    delta: "+13",
    dps: "7.4",
    duration: "15s",
    form: "Bear",
    guild: "Night Watch",
    index: 2,
    item: "Rough Bracers",
    key: "K",
    kind: "Weapon",
    label: "Wolf",
    level: 10,
    loser: "Mira",
    max: 25,
    message: "Meet at the inn",
    min: 16,
    money: "12 copper",
    name: "Aki",
    needed: 400,
    perCombo: 7,
    percent: 30,
    position: 3,
    price: "1g 20s",
    proceeds: "95s",
    quality: "Rare",
    rating: 1513,
    range: 30,
    rank: 2,
    resource: "Mana",
    seconds: 7,
    slot: 5,
    source: "Wolf",
    speed: 2.4,
    stat: "Strength",
    status: "Complete",
    summary: "30 Mana / Instant",
    tab: "Damage",
    target: "Wolf",
    view: "Current",
    winner: "Rook",
    total: 125,
    used: 2,
    value: 9,
    xp: 450,
    zone: "Northshire",
  };

  function verifyKeys(base: Record<string, unknown>, target: Record<string, unknown>, path = "") {
    for (const key in base) {
      const currentPath = path ? `${path}.${key}` : key;
      expect(target).toHaveProperty(key);
      const baseValue = base[key];
      const targetValue = target[key];
      if (typeof baseValue === "object" && baseValue !== null) {
        expect(typeof target[key]).toBe("object");
        verifyKeys(baseValue as Record<string, unknown>, targetValue as Record<string, unknown>, currentPath);
      } else {
        expect(typeof targetValue).toBe("string");
        const text = targetValue as string;
        expect(text.trim().length, `${currentPath} should not be empty`).toBeGreaterThan(0);
        expect(text, `${currentPath} should not contain placeholder markers`).not.toMatch(placeholderPattern);
      }
    }
  }

  function nestedString(target: Record<string, unknown>, key: string): string {
    let node: unknown = target;
    for (const segment of key.split(".")) {
      if (typeof node !== "object" || node === null || !(segment in node)) return "";
      node = (node as Record<string, unknown>)[segment];
    }
    return typeof node === "string" ? node : "";
  }

  function flattenStrings(base: Record<string, unknown>, path = ""): { key: TranslationKey; value: string }[] {
    const entries: { key: TranslationKey; value: string }[] = [];
    for (const [key, value] of Object.entries(base)) {
      const currentPath = path ? `${path}.${key}` : key;
      if (typeof value === "string") {
        entries.push({ key: currentPath as TranslationKey, value });
      } else if (typeof value === "object" && value !== null) {
        entries.push(...flattenStrings(value as Record<string, unknown>, currentPath));
      }
    }
    return entries;
  }

  function placeholders(value: string): string[] {
    return [...value.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)].map((match) => match[1]).sort();
  }

  function entityCount(kind: string, field: string): number {
    return entityTranslationManifest().filter((entry) => entry.kind === kind && entry.field === field).length;
  }

  type EntityManifestEntry = ReturnType<typeof entityTranslationManifest>[number];
  type EntityRequest = Parameters<typeof tEntity>[0];

  function phaseSevenRequest(entry: EntityManifestEntry): EntityRequest {
    if (entry.kind === "class") {
      return { kind: "class", id: entry.id as PlayerClass, field: entry.field as "name" | "description" };
    }
    if (entry.kind === "ability") {
      return { kind: "ability", id: entry.id, field: entry.field as "name" | "description", values: { damage: "11-14" } };
    }
    throw new Error(`Unexpected Phase 7 entity kind: ${entry.kind}`);
  }

  function sourceFilesUnder(relativeDir: string): string[] {
    const root = path.resolve(process.cwd(), relativeDir);
    if (!fs.existsSync(root)) return [];
    const files: string[] = [];
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      const entryPath = path.join(root, entry.name);
      if (entry.isDirectory()) files.push(...sourceFilesUnder(path.relative(process.cwd(), entryPath)));
      else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) files.push(entryPath);
    }
    return files;
  }

  for (const [code, locale] of Object.entries(locales)) {
    it(`should have 100% key match and non-empty translations for locale: ${code}`, () => {
      verifyKeys(en, locale);
    });
  }

  it("should resolve nested keys accurately using t() helper", () => {
    setLanguage("en");
    expect(t("nav.home")).toBe("Home");
    expect(t("auth.usernamePlaceholder")).toBe("Enter username");
    expect(t("loading.worldProgress", { done: 3, total: 9 })).toBe("Loading world... 3/9");

    setLanguage("es");
    expect(t("nav.home")).toBe("Inicio");
    expect(t("auth.usernamePlaceholder")).toBe("Introduce tu usuario");
    expect(t("character.levelClass", { level: 7, className: "Maga" })).toBe("Nivel 7 Maga");

    setLanguage("en");
  });

  it("should expose typed locale utilities for shell metadata and formatting", () => {
    expect(supportedLanguages).toEqual([
      "en",
      "es",
      "es_ES",
      "fr_FR",
      "fr_CA",
      "en_CA",
      "it_IT",
      "de_DE",
      "zh_CN",
      "zh_TW",
      "ko_KR",
      "ja_JP",
      "pt_BR",
      "ru_RU",
    ]);
    expect(isSupportedLanguage("de_DE")).toBe(true);
    expect(isSupportedLanguage("de-DE")).toBe(false);
    expect(languageTag("fr_CA")).toBe("fr-CA");
    expect(formatNumber(1234.5, { maximumFractionDigits: 1 }, "de_DE")).toBe("1.234,5");
    expect(formatDateTime(new Date(Date.UTC(2026, 5, 14, 12)), { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC" }, "en")).toBe("06/14/2026");
  });

  it("should keep technical transport errors out of localized user-facing dictionaries", () => {
    for (const locale of [en, ...Object.values(locales)]) {
      expect(locale.errors.api).not.toHaveProperty("requestFailed");
    }
  });

  it("should include current phase public shell keys in every locale", () => {
    for (const key of phaseOneShellKeys) {
      for (const lang of supportedLanguages) {
        setLanguage(lang);
        expect(t(key), `${lang}.${key}`).not.toBe(key);
        expect(t(key).trim().length, `${lang}.${key}`).toBeGreaterThan(0);
      }
    }
    setLanguage("en");
  });

  it("should include current phase HUD, chat, and combat keys in every locale", () => {
    for (const key of phaseTwoHudKeys) {
      for (const lang of supportedLanguages) {
        setLanguage(lang);
        expect(t(key), `${lang}.${key}`).not.toBe(key);
        expect(t(key).trim().length, `${lang}.${key}`).toBeGreaterThan(0);
      }
    }
    setLanguage("en");
  });

  it("should include current phase action bar, spellbook, and ability tooltip keys in every locale", () => {
    for (const key of phaseThreeAbilityKeys) {
      for (const lang of supportedLanguages) {
        setLanguage(lang);
        expect(t(key), `${lang}.${key}`).not.toBe(key);
        expect(t(key).trim().length, `${lang}.${key}`).toBeGreaterThan(0);
      }
    }
    setLanguage("en");
  });

  it("should include current phase quest log and dialogue keys in every locale", () => {
    for (const key of phaseFourQuestKeys) {
      for (const lang of supportedLanguages) {
        setLanguage(lang);
        expect(t(key), `${lang}.${key}`).not.toBe(key);
        expect(t(key).trim().length, `${lang}.${key}`).toBeGreaterThan(0);
      }
    }
    setLanguage("en");
  });

  it("should include current phase item, vendor, market, and currency keys in every locale", () => {
    for (const key of phaseFiveItemKeys) {
      for (const lang of supportedLanguages) {
        setLanguage(lang);
        expect(t(key), `${lang}.${key}`).not.toBe(key);
        expect(t(key).trim().length, `${lang}.${key}`).toBeGreaterThan(0);
      }
    }
    setLanguage("en");
  });

  it("should enumerate Phase 6 entity source coverage for later translation phases", () => {
    const manifest = entityTranslationManifest();
    expect(new Set(manifest.map((entry) => entry.key)).size).toBe(manifest.length);
    for (const entry of manifest) {
      expect(entry.source.trim().length, `${entry.kind}.${entry.id}.${entry.field}`).toBeGreaterThan(0);
    }

    expect(entityCount("class", "name")).toBe(Object.keys(CLASSES).length);
    expect(entityCount("class", "description")).toBe(Object.keys(CLASSES).length);
    expect(entityCount("ability", "name")).toBe(Object.keys(ABILITIES).length);
    expect(entityCount("ability", "description")).toBe(Object.keys(ABILITIES).length);
    expect(entityCount("item", "name")).toBe(Object.keys(ITEMS).length);
    expect(entityCount("mob", "name")).toBe(Object.keys(MOBS).length);
    expect(entityCount("npc", "name")).toBe(Object.keys(NPCS).length);
    expect(entityCount("npc", "title")).toBe(Object.keys(NPCS).length);
    expect(entityCount("npc", "greeting")).toBe(Object.keys(NPCS).length);
    expect(entityCount("quest", "title")).toBe(Object.keys(QUESTS).length);
    expect(entityCount("quest", "text")).toBe(Object.keys(QUESTS).length);
    expect(entityCount("quest", "completion")).toBe(Object.keys(QUESTS).length);
    expect(entityCount("questObjective", "label")).toBe(Object.values(QUESTS).reduce((sum, quest) => sum + quest.objectives.length, 0));
  });

  it("should resolve Phase 7 class and ability text without canonical fallbacks", () => {
    resetEntityTranslationFallbackLog();
    setLanguage("de_DE");
    expect(tEntity({ kind: "class", id: "mage", field: "name" })).toBe(t("classes.mage"));
    expect(entityTranslationFallbackLog()).toHaveLength(0);

    const ability = ABILITIES.fireball;
    const abilityName = tEntity({ kind: "ability", id: ability.id, field: "name" });
    const abilityDescription = tEntity({ kind: "ability", id: ability.id, field: "description", values: { damage: "11-14" } });
    expect(abilityName).toBe("Feuerball");
    expect(abilityName).not.toBe(ability.name);
    expect(abilityDescription).toContain("11-14");
    expect(abilityDescription).not.toContain("$d");
    expect(abilityDescription).not.toContain("{damage}");
    expect(entityTranslationFallbackLog()).toHaveLength(0);

    const npcGreeting = tEntity({ kind: "npc", id: "marshal_redbrook", field: "greeting", values: { className: "Magier", classNameLower: "magier" } });
    expect(npcGreeting).toContain("magier");
    expect(npcGreeting).not.toContain("$C");
    expect(entityTranslationFallbackLog().map((entry) => entry.key)).toEqual([
      entityTranslationKey({ kind: "npc", id: "marshal_redbrook", field: "greeting" }),
    ]);

    setLanguage("en");
    resetEntityTranslationFallbackLog();
  });

  it("should provide every Phase 7 class and ability translation in every locale", () => {
    const phaseSevenEntries = entityTranslationManifest().filter((entry) => entry.phase === "phase7");
    expect(phaseSevenEntries).toHaveLength((Object.keys(CLASSES).length * 2) + (Object.keys(ABILITIES).length * 2));
    expect(missingEntityTranslationsForPhases(["phase7"])).toHaveLength(0);

    for (const lang of supportedLanguages) {
      setLanguage(lang);
      resetEntityTranslationFallbackLog();
      for (const entry of phaseSevenEntries) {
        const rendered = tEntity(phaseSevenRequest(entry));
        expect(rendered.trim().length, `${lang}.${entry.key}`).toBeGreaterThan(0);
        expect(rendered, `${lang}.${entry.key}`).not.toBe(entry.key);
        expect(rendered, `${lang}.${entry.key}`).not.toContain("$d");
        expect(rendered, `${lang}.${entry.key}`).not.toMatch(/\{damage\}/);
        if (lang !== "en" && lang !== "en_CA" && entry.kind === "ability" && entry.field === "description") {
          expect(rendered, `${lang}.${entry.key} should not use English yard abbreviation`).not.toMatch(/\byd\b/i);
        }
        if (entry.kind === "ability" && entry.field === "description" && entry.source.includes("$d")) {
          expect(rendered, `${lang}.${entry.key}`).toContain("11-14");
        }
      }
      expect(entityTranslationFallbackLog(), `${lang} Phase 7 fallback log`).toHaveLength(0);
    }

    setLanguage("en");
  });

  it("should route Phase 7 class-detail damage ranges through localized templates", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/main.ts"), "utf8");
    expect(source).toContain("abilityUi.tooltip.damageRange");
    expect(source).toContain("abilityUi.tooltip.finisherDamage");
    expect(source).not.toContain(" to ${primaryEffect.max}");
    expect(source).not.toContain(" plus ${primaryEffect.perCombo} per combo point");

    setLanguage("de_DE");
    expect(t("abilityUi.tooltip.damageRange", { min: "16", max: "25" })).toBe("16 bis 25");
    setLanguage("zh_CN");
    expect(t("abilityUi.tooltip.damageRange", { min: "16", max: "25" })).toBe("16 到 25");
    setLanguage("en");
  });

  it("should expose phase-gated missing entity translations before later phases are accepted", () => {
    const phaseSevenMissing = missingEntityTranslationsForPhases(["phase7"]);
    expect(phaseSevenMissing).toHaveLength(0);

    expect(missingEntityTranslationsForPhases(["phase8"]).some((entry) => entry.key === entityTranslationKey({ kind: "item", id: "worn_sword", field: "name" }))).toBe(true);
    expect(missingEntityTranslationsForPhases(["phase9"]).some((entry) => entry.key === entityTranslationKey({ kind: "npc", id: "marshal_redbrook", field: "greeting" }))).toBe(true);
    expect(missingEntityTranslationsForPhases(["phase9"]).some((entry) => entry.key === entityTranslationKey({ kind: "questObjective", questId: "q_wolves", objectiveIndex: 0, field: "label" }))).toBe(true);
    expect(() => assertEntityTranslationsReady([])).not.toThrow();
    expect(() => assertEntityTranslationsReady(["phase7"])).not.toThrow();
  });

  it("should keep the entity resolver out of simulation and server modules", () => {
    for (const file of [...sourceFilesUnder("src/sim"), ...sourceFilesUnder("server")]) {
      const source = fs.readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/(?:from|import)\s+["'][^"']*ui\/(?:i18n|entity_i18n)["']/);
    }
  });

  it("should preserve and render every Phase 2 HUD interpolation placeholder in every locale", () => {
    const phaseTwoDynamicKeys = flattenStrings(en.hud, "hud")
      .map(({ key, value }) => ({ key, expected: placeholders(value) }))
      .filter(({ expected }) => expected.length > 0);
    const allLocales: Record<string, typeof en> = { en, ...locales };

    for (const { key, expected } of phaseTwoDynamicKeys) {
      for (const [lang, locale] of Object.entries(allLocales)) {
        const template = nestedString(locale, key);
        expect(placeholders(template), `${lang}.${key} placeholders`).toEqual(expected);
        expect(isSupportedLanguage(lang)).toBe(true);
        if (!isSupportedLanguage(lang)) continue;
        setLanguage(lang);
        const rendered = t(key, interpolationValues);
        expect(rendered, `${lang}.${key} should not leave placeholders unresolved`).not.toMatch(/\{[A-Za-z][A-Za-z0-9]*\}/);
        for (const placeholder of expected) {
          expect(rendered, `${lang}.${key} should include ${placeholder}`).toContain(String(interpolationValues[placeholder]));
        }
      }
    }

    setLanguage("en");
  });

  it("should preserve and render every Phase 3 ability UI interpolation placeholder in every locale", () => {
    const phaseThreeDynamicKeys = flattenStrings(en.abilityUi, "abilityUi")
      .map(({ key, value }) => ({ key, expected: placeholders(value) }))
      .filter(({ expected }) => expected.length > 0);
    const allLocales: Record<string, typeof en> = { en, ...locales };

    for (const { key, expected } of phaseThreeDynamicKeys) {
      for (const [lang, locale] of Object.entries(allLocales)) {
        const template = nestedString(locale, key);
        expect(placeholders(template), `${lang}.${key} placeholders`).toEqual(expected);
        expect(isSupportedLanguage(lang)).toBe(true);
        if (!isSupportedLanguage(lang)) continue;
        setLanguage(lang);
        const rendered = t(key, interpolationValues);
        expect(rendered, `${lang}.${key} should not leave placeholders unresolved`).not.toMatch(/\{[A-Za-z][A-Za-z0-9]*\}/);
        for (const placeholder of expected) {
          expect(rendered, `${lang}.${key} should include ${placeholder}`).toContain(String(interpolationValues[placeholder]));
        }
      }
    }

    setLanguage("en");
  });

  it("should preserve and render every Phase 4 quest UI interpolation placeholder in every locale", () => {
    const phaseFourDynamicKeys = flattenStrings(en.questUi, "questUi")
      .map(({ key, value }) => ({ key, expected: placeholders(value) }))
      .filter(({ expected }) => expected.length > 0);
    const allLocales: Record<string, typeof en> = { en, ...locales };

    for (const { key, expected } of phaseFourDynamicKeys) {
      for (const [lang, locale] of Object.entries(allLocales)) {
        const template = nestedString(locale, key);
        expect(placeholders(template), `${lang}.${key} placeholders`).toEqual(expected);
        expect(isSupportedLanguage(lang)).toBe(true);
        if (!isSupportedLanguage(lang)) continue;
        setLanguage(lang);
        const rendered = t(key, interpolationValues);
        expect(rendered, `${lang}.${key} should not leave placeholders unresolved`).not.toMatch(/\{[A-Za-z][A-Za-z0-9]*\}/);
        for (const placeholder of expected) {
          expect(rendered, `${lang}.${key} should include ${placeholder}`).toContain(String(interpolationValues[placeholder]));
        }
      }
    }

    setLanguage("en");
  });

  it("should preserve and render every Phase 5 item UI interpolation placeholder in every locale", () => {
    const phaseFiveDynamicKeys = flattenStrings(en.itemUi, "itemUi")
      .map(({ key, value }) => ({ key, expected: placeholders(value) }))
      .filter(({ expected }) => expected.length > 0);
    const allLocales: Record<string, typeof en> = { en, ...locales };

    for (const { key, expected } of phaseFiveDynamicKeys) {
      for (const [lang, locale] of Object.entries(allLocales)) {
        const template = nestedString(locale, key);
        expect(placeholders(template), `${lang}.${key} placeholders`).toEqual(expected);
        expect(isSupportedLanguage(lang)).toBe(true);
        if (!isSupportedLanguage(lang)) continue;
        setLanguage(lang);
        const rendered = t(key, interpolationValues);
        expect(rendered, `${lang}.${key} should not leave placeholders unresolved`).not.toMatch(/\{[A-Za-z][A-Za-z0-9]*\}/);
        for (const placeholder of expected) {
          expect(rendered, `${lang}.${key} should include ${placeholder}`).toContain(String(interpolationValues[placeholder]));
        }
      }
    }

    setLanguage("en");
  });

  it("should interpolate Phase 2 combat, chat, and log templates without dropping values", () => {
    setLanguage("de_DE");
    expect(t("hud.combat.damageDoneCrit", { ability: "Feuerball", target: "Wolf", amount: 42 })).toContain("42");
    expect(t("hud.errors.chatCooldown", { seconds: 7 })).toContain("7");

    setLanguage("ja_JP");
    const guildChat = t("hud.chat.templates.guild", { name: "Aki", message: "集合" });
    expect(guildChat).toContain("Aki");
    expect(guildChat).toContain("集合");

    setLanguage("zh_CN");
    expect(t("hud.logs.lootReceiveItem", { item: "粗糙护腕" })).toContain("粗糙护腕");

    setLanguage("en");
  });

  it("should format Phase 3 ability tooltip templates without dropping dynamic values", () => {
    setLanguage("de_DE");
    expect(t("abilityUi.tooltip.cooldownSeconds", { seconds: 8 })).toContain("8");
    expect(t("abilityUi.spellbook.trainableAtLevel", { level: 10 })).toContain("10");

    setLanguage("ko_KR");
    const knownAbility = t("abilityUi.spellbook.knownAbilityAria", {
      name: "Fireball",
      rank: 2,
      summary: "30 Mana / Instant",
    });
    expect(knownAbility).toContain("Fireball");
    expect(knownAbility).toContain("2");

    setLanguage("ja_JP");
    const finisher = t("abilityUi.tooltip.finisherDamage", { base: 14, perCombo: 7 });
    expect(finisher).toContain("14");
    expect(finisher).toContain("7");

    setLanguage("en");
  });

  it("should format Phase 4 quest UI templates without dropping dynamic values", () => {
    setLanguage("de_DE");
    expect(t("questUi.log.summary", { active: 3, completed: 8 })).toContain("3");
    expect(t("questUi.log.summary", { active: 3, completed: 8 })).toContain("8");

    setLanguage("fr_FR");
    expect(t("questUi.dialog.availableQuestAria", { name: "A Swift Response" })).toContain("A Swift Response");

    setLanguage("ja_JP");
    const progress = t("questUi.detail.objectiveProgress", { label: "Forest Wolves slain", current: 4, total: 8 });
    expect(progress).toContain("Forest Wolves slain");
    expect(progress).toContain("4");
    expect(progress).toContain("8");

    setLanguage("en");
  });

  it("should format Phase 5 item UI and money helpers without dropping dynamic values", () => {
    setLanguage("de_DE");
    expect(t("itemUi.vendor.goodsTitle", { name: "Haldren" })).toContain("Haldren");
    expect(t("itemUi.market.sellNote", { cut: 5, used: 2, max: 12 })).toContain("5");
    expect(formatMoney(123456)).toBe("12G 34S 56K");

    setLanguage("fr_FR");
    expect(t("itemUi.logs.sellerSold", { buyer: "Mira", item: "Cracked Wolf Fang", money: "1 po", proceeds: "95 pa" })).toContain("Mira");
    expect(formatMoney(10001)).toBe("1po 0pa 1pc");

    setLanguage("ja_JP");
    expect(t("itemUi.tooltip.useFood", { amount: 61, seconds: 18 })).toContain("61");
    expect(formatMoney(7)).toBe("7銅");

    setLanguage("en");
  });

  it("should expose all supported hreflang alternates in index.html", () => {
    const html = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf8");
    const expectedHreflang = [
      "en",
      "es",
      "es-ES",
      "fr-FR",
      "fr-CA",
      "en-CA",
      "it-IT",
      "de-DE",
      "zh-CN",
      "zh-TW",
      "ko-KR",
      "ja-JP",
      "pt-BR",
      "ru-RU",
      "x-default",
    ];
    for (const hreflang of expectedHreflang) {
      expect(html, `missing hreflang ${hreflang}`).toContain(`hreflang="${hreflang}"`);
    }
    expect(html).toContain('data-i18n-content="seo.description"');
    expect(html).toContain('data-i18n-placeholder="hud.core.chatPlaceholder"');
    expect(html).toContain('data-i18n="hud.core.chatTab"');
    expect(html).toContain('data-i18n-title="itemUi.bags.title"');
    expect(html).toContain('id="structured-data"');
  });
});
