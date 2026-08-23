#!/usr/bin/env python3
"""Build the standalone Kudos Portal bundle.

The upstream artefact ships as a self-extracting bundle: fonts, the runtime and
the page image live in a base64 manifest, and the application itself is one
JSON-encoded string in a <script type="__bundler/template"> island. We keep that
shell verbatim in build/bundle-shell.html with the template replaced by a
placeholder, edit the readable source in src/, and re-inject on build.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SHELL = os.path.join(HERE, 'build', 'bundle-shell.html')
SOURCE = os.path.join(HERE, 'src', 'kudos-portal.dc.html')
OUT = os.path.join(HERE, 'Kudos_Portal.html')
PLACEHOLDER = '"__KUDOS_TEMPLATE__"'


def build(out=OUT):
    shell = open(SHELL, encoding='utf-8').read()
    if shell.count(PLACEHOLDER) != 1:
        sys.exit('bundle-shell.html: expected exactly one template placeholder')
    app = open(SOURCE, encoding='utf-8').read()
    # '</' is escaped so the payload can never close the host <script> early.
    payload = json.dumps(app).replace('</', '<\\u002F')
    open(out, 'w', encoding='utf-8').write(shell.replace(PLACEHOLDER, payload))
    print('built %s (%.1f KB)' % (out, os.path.getsize(out) / 1024))


if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else OUT)
