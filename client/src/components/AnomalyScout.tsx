import { AnomalyVolatility } from './AnomalyVolatility';

export function AnomalyScout({ socketAlert }: { socketAlert: any }) {
  return (
    <div className="max-w-6xl space-y-8 animate-in fade-in duration-700 pb-20 md:pb-0">
      <h2 className="text-3xl md:text-4xl premium-header text-white uppercase leading-none">Scout: Anomaly Search</h2>
      <AnomalyVolatility socketAlert={socketAlert} />
    </div>
  );
}
