export const resolveColorToHex = (colorStr) => {
  if (!colorStr) return '#000000';
  const clean = colorStr.trim().toLowerCase();
  
  // If it starts with #, it's already a hex code
  if (clean.startsWith('#')) return clean;

  // Auto-prefix hex codes if they are 3 or 6 chars and alphanumeric hex
  if (/^[0-9a-fA-F]{3}$/.test(clean) || /^[0-9a-fA-F]{6}$/.test(clean)) {
    return `#${clean}`;
  }

  const colorMap = {
    'cream': '#FFF8F0',
    'crim': '#E11D48',
    'crimson': '#E11D48',
    'white': '#FFFFFF',
    'off-white': '#FAF9F6',
    'offwhite': '#FAF9F6',
    'black': '#000000',
    'grey': '#808080',
    'gray': '#808080',
    'charcoal': '#36454F',
    'beige': '#F5F5DC',
    'navy': '#000080',
    'olive': '#808000',
    'teal': '#008080',
    'red': '#FF0000',
    'blue': '#0000FF',
    'green': '#008000',
    'yellow': '#FFFF00',
    'orange': '#FFA500',
    'purple': '#800080',
    'pink': '#FFC0CB',
    'brown': '#A52A2A',
    'sand': '#C2B280'
  };

  return colorMap[clean] || clean; // fall back to original (e.g. standard CSS name if not in map)
};

/**
 * Distributes/scatters products from the same design family (same parent or color group)
 * so they are not displayed adjacent to each other in the shop grid, replicating Bewakoof's layout style.
 */
export const scatterProducts = (list) => {
  if (!list || list.length <= 2) return list || [];
  
  const getFamilyKey = (p) => {
    // If it's a sibling product (Option A), group by color_group_id
    if (p.color_group_id) return `group-${p.color_group_id}`;
    // If it's an exploded variant card (Option B), group by parent product ID
    return `product-${p.$id || p.id}`;
  };

  // Group by family
  const families = {};
  list.forEach(p => {
    const key = getFamilyKey(p);
    if (!families[key]) families[key] = [];
    families[key].push(p);
  });

  // Interleave the families using a round-robin strategy
  const result = [];
  const familyKeys = Object.keys(families);
  
  // Sort families so families with more items are processed first
  familyKeys.sort((a, b) => families[b].length - families[a].length);

  let maxLen = 0;
  familyKeys.forEach(k => {
    if (families[k].length > maxLen) maxLen = families[k].length;
  });

  for (let i = 0; i < maxLen; i++) {
    familyKeys.forEach(key => {
      if (families[key][i]) {
        result.push(families[key][i]);
      }
    });
  }

  return result;
};
