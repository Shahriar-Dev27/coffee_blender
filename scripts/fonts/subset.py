import pathlib, sys
root = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / 'art/font-tools'))
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset
for name, axes in [('bricolage-grotesque-latin', {'opsz':48,'wght':(700,700,800)}), ('instrument-sans-latin', {'wght':(400,400,600)})]:
    original = root / 'art/font-originals' / (name + '.woff2')
    target = root / 'public/fonts' / (name + '.woff2')
    font = instantiateVariableFont(TTFont(original), axes, inplace=True)
    if 'gvar' in font:
        font['gvar'].variations = {g: font['gvar'].variations.get(g, []) for g in font.getGlyphOrder()}
    options = subset.Options()
    options.flavor = 'woff2'
    display = name.startswith('bricolage')
    if display: options.layout_features = ['kern','liga','calt','locl']
    sub = subset.Subsetter(options=options)
    sub.populate(unicodes=list(range(32,127 if display else 256))+[0x2013,0x2014,0x2018,0x2019,0x201c,0x201d,0x2026,0x20ac,0x2191,0x2193,0x2212])
    sub.subset(font)
    font.flavor = 'woff2'
    font.recalcTimestamp = False
    font['head'].modified = TTFont(original)['head'].modified
    font.save(target)
    print(name, original.stat().st_size, '->', target.stat().st_size)
