const TAILLE_PAQUET = 1000;

// La base ne renvoie que 1000 lignes par requête : on lit par paquets jusqu'à tout avoir.
export async function lireToutesLesLignes<T>(
  construire: (
    debut: number,
    fin: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const tout: T[] = [];
  for (let debut = 0; ; debut += TAILLE_PAQUET) {
    const { data, error } = await construire(debut, debut + TAILLE_PAQUET - 1);
    if (error) throw new Error(error.message);
    const paquet = data ?? [];
    tout.push(...paquet);
    if (paquet.length < TAILLE_PAQUET) break;
  }
  return tout;
}
