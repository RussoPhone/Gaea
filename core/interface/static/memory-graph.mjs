function list(value) {
  return Array.isArray(value) ? value : [];
}

function signatureLabel(signature) {
  const values = list(signature);
  return values.length ? values.join("·") : "∅";
}

export function experienceId(item) {
  const signature = list(item?.signature).join(",");
  return `experience:${item?.tick}:${item?.source}:${item?.actor}:${item?.action}:${item?.target ?? "-"}:${signature}`;
}

export function buildMemoryGraph(memory) {
  const relations = list(memory?.relations)
    .slice()
    .sort((left, right) => Number(right.weight || 0) - Number(left.weight || 0));
  const experiences = new Map();
  for (const experience of list(memory?.experiences)) {
    experiences.set(experienceId(experience), experience);
  }
  for (const relation of relations) {
    for (const evidence of list(relation.evidence)) {
      experiences.set(experienceId(evidence), evidence);
    }
  }

  const nodes = relations.map((relation) => ({
    id: `relation:${relation.id}`,
    kind: "relation",
    label: `assinatura ${signatureLabel(relation.signature)} · ${relation.action || "sem ação"}`,
    weight: Number(relation.weight || 0),
    confidence: Number(relation.confidence || 0),
    contradictions: Number(relation.contradictions || 0),
    data: relation,
  }));
  const orderedExperiences = [...experiences.entries()]
    .sort(([, left], [, right]) => Number(right.tick || 0) - Number(left.tick || 0));
  for (const [id, experience] of orderedExperiences) {
    nodes.push({
      id,
      kind: "experience",
      label: `t ${experience.tick} · ${experience.action || "sem ação"}`,
      data: experience,
    });
  }

  const known = new Set(experiences.keys());
  const edges = [];
  for (const relation of relations) {
    for (const evidence of list(relation.evidence)) {
      const target = experienceId(evidence);
      if (known.has(target)) edges.push({ from: `relation:${relation.id}`, to: target });
    }
  }
  return { nodes, edges };
}
