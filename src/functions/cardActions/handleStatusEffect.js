export default async function handleStatusEffect(state, player, events) {
  const { status } = state;

  const effect = status[player].effect;
  if (!effect) return;

  if (effect === "healing") {
    status[player].hp += 5;
    events.push({
      label: `:heart: {${player}} に HP5 の持続回復効果`,
    });

    const rand = Math.random();
    const probability = 0.3;
    if (rand < probability) {
      status[player].effect = null;
      events.push({
        label: `:x: {${player}} の持続回復効果が切れた`,
      });
    }
  }
}
