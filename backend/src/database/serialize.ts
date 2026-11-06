import { DataSource } from 'typeorm';

const queues = new WeakMap<DataSource, Promise<unknown>>();

// better-sqlite3 comparte una sola conexión: dos transacciones simultáneas se anidarían como savepoints y se
// confirmarían o revertirían juntas. Todo trabajo que escribe se encola por DataSource, sea cual sea el servicio.
export function serialize<T>(dataSource: DataSource, work: () => Promise<T>): Promise<T> {
  const run = (queues.get(dataSource) ?? Promise.resolve()).then(work, work);
  queues.set(dataSource, run.catch(() => undefined));
  return run;
}
