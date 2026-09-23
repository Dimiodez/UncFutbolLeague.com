function adjacencyFor(course, disabledEdgeIds) {
  const adjacency = new Map(course.nodes.map((node) => [node, []]));
  course.edges.forEach((edge) => {
    if (disabledEdgeIds.has(edge.id) || !adjacency.has(edge.from) || !adjacency.has(edge.to)) return;
    adjacency.get(edge.from).push(edge.to);
    if (edge.bidirectional !== false) adjacency.get(edge.to).push(edge.from);
  });
  return adjacency;
}

export function hasPhysicalRoute(course, disabledEdgeIds = []) {
  const disabled = new Set(disabledEdgeIds);
  const adjacency = adjacencyFor(course, disabled);
  if (!adjacency.has(course.start) || !adjacency.has(course.summit)) return false;
  const visited = new Set([course.start]);
  const queue = [course.start];
  while (queue.length) {
    const node = queue.shift();
    if (node === course.summit) return true;
    adjacency.get(node).forEach((next) => {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    });
  }
  return false;
}

export function safeDisruptions(course, candidates) {
  return candidates.filter((candidate) => hasPhysicalRoute(course, candidate.disableEdgeIds));
}

export function chooseSafeDisruption(course, candidates, random = Math.random) {
  const safe = safeDisruptions(course, candidates);
  if (!safe.length) return null;
  const index = Math.min(safe.length - 1, Math.floor(random() * safe.length));
  return safe[index];
}
