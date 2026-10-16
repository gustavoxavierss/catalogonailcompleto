export function imageLayout(width = 1, height = 1) {
  const ratio = width / height;
  if (ratio < 0.68) return "tall";
  if (ratio > 2.4) return "panorama";
  if (ratio < 0.9) return "portrait";
  if (ratio > 1.15) return "landscape";
  return "square";
}
