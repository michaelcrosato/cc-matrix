// Inverse-hull shells must face inward. A front-facing shell sits just outside the
// kart and covers the cel body. BackSide leaves only the silhouette.
export function outlineMaterialOptions(THREE) {
  return { color: 0x141018, side: THREE.BackSide };
}
