#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const pagePath = 'app/page.tsx';
const clientPath = 'components/home/home-page-client.tsx';
const translationsPath = 'lib/translations.ts';
const headerPath = 'components/ui/header.tsx';
const mobileNavPath = 'components/ui/mobile-nav.tsx';
const languageTogglePath = 'components/ui/language-toggle.tsx';

for (const file of [pagePath, clientPath, translationsPath, headerPath, mobileNavPath, languageTogglePath]) {
  assert.ok(fs.existsSync(file), `${file} should exist`);
}

const page = fs.readFileSync(pagePath, 'utf8');
const client = fs.readFileSync(clientPath, 'utf8');
const translations = fs.readFileSync(translationsPath, 'utf8');
const header = fs.readFileSync(headerPath, 'utf8');
const mobileNav = fs.readFileSync(mobileNavPath, 'utf8');
const languageToggle = fs.readFileSync(languageTogglePath, 'utf8');

assert.match(page, /<HomePageClient\s+recentPosts=\{recentPosts\}/, 'home page should delegate rendering to client i18n component');
assert.doesNotMatch(page, /i18n-exempt/, 'home page should not be exempt after language switching is wired');
assert.match(client, /^"use client";/, 'home client must be a client component');
assert.match(client, /useLanguage\(\)/, 'home client should consume LanguageProvider');
assert.match(client, /homeCopy\[language\]/, 'home client should select copy by active language');
assert.match(client, /SHawn_LAB · public web gateway/, 'English hero copy should be present');
assert.match(client, /SHawn_LAB · 공개 웹 게이트웨이/, 'Korean hero copy should be present');
assert.match(client, /Recent Posts/, 'English latest-post heading should be present');
assert.match(client, /최근 블로그 글/, 'Korean latest-post heading should be present');
assert.match(translations, /home:\s*"홈"/, 'Korean nav.home translation should exist');
assert.match(translations, /home:\s*"Home"/, 'English nav.home translation should exist');
assert.match(header, /t\.nav\.home/, 'desktop header should use translated Home label');
assert.match(mobileNav, /t\.nav\.home/, 'mobile nav should use translated Home label');
assert.match(languageToggle, /KO/, 'language toggle should visibly expose KO state');
assert.match(languageToggle, /EN/, 'language toggle should visibly expose EN state');

console.log('home i18n tests passed');
