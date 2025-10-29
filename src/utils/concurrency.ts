export async function runConcurrent<T>(
  items: T[],
  worker: (item: T, index: number) => Promise<void>,
  concurrency = 3
): Promise<void> {
  const queue = [...items];
  const running: Promise<void>[] = [];

  while (queue.length > 0) {
    while (running.length < concurrency && queue.length > 0) {
      const i = items.length - queue.length;
      const task = worker(queue.shift()!, i).finally(() => {
        running.splice(running.indexOf(task), 1);
      });
      running.push(task);
    }
    await Promise.race(running);
  }

  await Promise.all(running);
}
