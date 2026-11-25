"""Turn a plan in Markdown into one plain readable HTML page (Inter, neutral palette, light and dark, tables).
    python tools/md_page.py <in.md> <out.html> "<title>"
"""
import sys
import markdown

src, out, title = sys.argv[1], sys.argv[2], sys.argv[3]
body = markdown.markdown(open(src, encoding='utf-8').read(), extensions=['tables', 'fenced_code', 'toc', 'sane_lists'])
css = """
:root{--bg:#fbfbfa;--fg:#1d1d1f;--mute:#6b6b70;--line:#e4e4e2;--acc:#d6457f;--code:#f1f1ef}
@media (prefers-color-scheme:dark){:root{--bg:#141416;--fg:#ececec;--mute:#9a9aa0;--line:#2c2c30;--acc:#ff7ab8;--code:#1f1f23}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 Inter,system-ui,-apple-system,sans-serif}
main{max-width:860px;margin:0 auto;padding:32px 20px 80px;overflow-wrap:anywhere}
h1{font-size:30px;line-height:1.15;margin:0 0 18px}h2{font-size:22px;margin:40px 0 10px;padding-top:14px;border-top:1px solid var(--line)}
h3{font-size:17px;margin:26px 0 8px}p,li{color:var(--fg)}a{color:var(--acc)}
table{border-collapse:collapse;width:100%;margin:12px 0;font-size:14px;display:block;overflow-x:auto}
th,td{border-bottom:1px solid var(--line);padding:7px 10px;text-align:left;vertical-align:top}th{font-weight:600;color:var(--mute)}
code{background:var(--code);border-radius:5px;padding:1px 5px;font-size:13.5px;word-break:break-word}pre{background:var(--code);padding:12px;border-radius:8px;overflow-x:auto}
blockquote{margin:12px 0;padding:2px 14px;border-left:3px solid var(--acc);color:var(--mute)}
"""
html = f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title><style>{css}</style></head><body><main>{body}</main></body></html>'
open(out, 'w', encoding='utf-8').write(html)
print(out)
