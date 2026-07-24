// Filtrage des réponses d'un formulaire par e-mail, nom ou prénom.
// Partagé par la page des réponses et l'export CSV pour que l'export porte
// exactement sur ce que l'écran affiche.

// Minuscules sans accents : « Jérôme » et « jerome » se valent.
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

type FilterQuestion = { id: string; contactField: string | null };

// Questions dont la réponse vaut identité (nom, prénom, e-mail) : elles s'ajoutent
// au compte Google du répondant dans la recherche.
export function searchableQuestionIds(questions: FilterQuestion[]): Set<string> {
  return new Set(
    questions
      .filter(
        (q) =>
          q.contactField === "FIRST_NAME" ||
          q.contactField === "LAST_NAME" ||
          q.contactField === "EMAIL" ||
          q.contactField === "SECONDARY_EMAIL",
      )
      .map((q) => q.id),
  );
}

type FilterResponse = {
  respondentEmail: string;
  respondentName: string | null;
  answers: { questionId: string; value: string }[];
};

// La réponse correspond-elle au terme recherché ? Un terme vide accepte tout.
export function matchesResponse(
  response: FilterResponse,
  searchableIds: Set<string>,
  term: string,
): boolean {
  const needle = normalize(term);
  if (!needle) return true;

  const haystack = [
    response.respondentEmail,
    response.respondentName ?? "",
    ...response.answers.filter((a) => searchableIds.has(a.questionId)).map((a) => a.value),
  ];
  return haystack.some((value) => normalize(value).includes(needle));
}
