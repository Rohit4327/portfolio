#!/usr/bin/env python3
"""One-shot mechanical pass: lift sub-12px interface text to a readable floor.

Two regions are deliberately left alone:
  * the signed-off shell (top bar, product rail, module strip),
  * the miniature Wall-of-Fame screen previews, where 6-9px type is a
    scaled-down 1920x1080 render and not interface text at all.
"""
import re, sys

PATH = 'src/kudos-portal.dc.html'
# font-size -> new size. 12px and 13px are already at the floor and are left
# for the per-section hierarchy work rather than shifted blindly.
SIZES = {'9': '11', '10': '12', '10.5': '12', '11': '12.5', '11.5': '12.5'}
# Lines rendering the simulated screen: their type is artwork, not UI.
PREVIEW = re.compile(r'ple\.preview|ov\.side\.|screenFg|#FFB273|#FFD9B8|sr\.label|sr\.value')

src = open(PATH, encoding='utf-8').read().split('\n')
# The frozen shell: <header aria-label="MutantX"> through the module tab strip.
first = next(i for i, l in enumerate(src) if l.startswith('<header aria-label="MutantX"'))
last = next(i for i, l in enumerate(src) if l.startswith('<sc-if value="{{ showIntro }}"'))

pat = re.compile(r'font-size:(' + '|'.join(sorted(SIZES, key=len, reverse=True)) + r')px')
changed = 0
for i, line in enumerate(src):
    if first <= i < last or PREVIEW.search(line):
        continue
    new, n = pat.subn(lambda m: 'font-size:' + SIZES[m.group(1)] + 'px', line)
    if n:
        src[i] = new
        changed += n
open(PATH, 'w', encoding='utf-8').write('\n'.join(src))
print('shell frozen lines %d-%d · %d sizes lifted' % (first + 1, last, changed))
