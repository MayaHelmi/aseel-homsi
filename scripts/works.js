// Every piece of Aseel's work, grouped by collection. Add or remove images here only.
// Every image is shown whole, never cropped.
// Every tile in a gallery is the same size; landscape images take two tiles side by side.
// fit: "tall" = cut-outs and sketches (slim tiles, shown whole), "photo" / "wide" = photos and boards (3:4 tiles, filled).
// focus: which part of a filled photo to keep when its edges are trimmed (default: centre).
(function () {
  const range = (n, fn) => Array.from({ length: n }, (_, i) => fn(i + 1));
  const pad = (n) => String(n).padStart(2, '0');
  const img = 'assets/images/';

  window.SITE_WORKS = {
    calligraphy: {
      title: { ar: 'الخط العربي والعمارة الحديثة', en: 'Arabic Calligraphy & Modern Architecture' },
      groups: [
        { label: { ar: 'التصوير النهائي', en: 'Final shoot' }, fit: 'photo',
          items: ['photos/cal-shoot-1', 'photos/cal-shoot-2', 'photos/cal-shoot-3'],
          focus: { 'photos/cal-shoot-3': 'top' } },
        { label: { ar: 'الرسومات', en: 'Illustrations' }, fit: 'tall',
          items: range(6, (i) => `collections/cal-sketch-${i}`) },
        { label: { ar: 'لوحة الإلهام ومراحل العمل', en: 'Mood board & process' }, fit: 'wide',
          items: ['process/cal-moodboard', 'process/cal-process'] }
      ]
    },
    heritage: {
      title: { ar: 'خيوط التراث', en: 'Threads of Heritage' },
      groups: [
        { label: { ar: 'الرسومات', en: 'Sketches' }, fit: 'tall',
          items: range(3, (i) => `collections/her-sketch-${i}`) },
        { label: { ar: 'لوحة الإلهام ومراحل العمل', en: 'Mood board & process' }, fit: 'wide',
          items: ['process/her-moodboard', 'process/her-process-1', 'process/her-process-2'] }
      ]
    },
    stellar: {
      title: { ar: 'ستيلار', en: 'Stellar' },
      groups: [
        { label: { ar: 'الرسومات', en: 'Sketches' }, fit: 'tall',
          items: range(7, (i) => `collections/stel-sketch-${i}`) },
        { label: { ar: 'لوحة الإلهام ومراحل العمل', en: 'Mood board & process' }, fit: 'wide',
          items: ['process/stel-moodboard', 'process/stel-process-1', 'process/stel-process-2', 'process/stel-process-3'] }
      ]
    },
    readyToWear: {
      title: { ar: 'الأزياء الجاهزة', en: 'Ready to Wear' },
      groups: [
        { label: { ar: 'الإطلالات', en: 'Looks' }, fit: 'tall',
          items: range(5, (i) => `ready-to-wear/look-${pad(i)}`) }
      ]
    },
    unisex: {
      title: { ar: 'مجموعة رياضية للجنسين', en: 'Sport Unisex' },
      groups: [
        { label: { ar: 'الإطلالات', en: 'Looks' }, fit: 'tall',
          items: range(5, (i) => `unisex/look-${pad(i)}`) }
      ]
    },
    gioiello: {
      title: { ar: 'جويلو · الإكسسوارات', en: 'Gioiello · Accessories' },
      groups: [
        { label: { ar: 'إكسسوارات الأزياء الراقية', en: 'Haute couture accessories' }, fit: 'photo',
          items: ['clutch', 'pearl-bag', 'gold-bag', 'earrings', 'earring-black', 'ring', 'necklace', 'teardrop'].map((n) => `accessories/acc-${n}`) },
        { label: { ar: 'إكسسوارات الأزياء الجاهزة', en: 'Ready-to-wear accessories' }, fit: 'photo',
          items: range(6, (i) => `accessories/acc-rtw-${i}`) },
        { label: { ar: 'إكسسوارات رياضية للجنسين', en: 'Unisex accessories' }, fit: 'photo',
          items: range(9, (i) => `accessories/acc-unisex-${i}`) },
        { label: { ar: 'إطلالات منسّقة', en: 'Styled sets' }, fit: 'photo',
          items: range(5, (i) => `sets/set-${i}`) },
        { label: { ar: 'أحذية وحقائب ونظارات', en: 'Footwear, bags & eyewear' }, fit: 'wide',
          items: ['process/accessories-collage'] }
      ]
    }
  };

  // Resolve short names to file paths
  Object.values(window.SITE_WORKS).forEach((c) => c.groups.forEach((g) => {
    const focus = g.focus || {};
    g.items = g.items.map((name) => ({ src: `${img}${name}.webp`, focus: focus[name] }));
  }));
})();
