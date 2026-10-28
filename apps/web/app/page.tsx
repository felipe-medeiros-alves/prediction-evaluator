import { Workbench } from '@/components/workbench';
import { samples } from '@/lib/samples';

export default function HomePage() {
  return (
    <main className="page">
      <header className="page-header">
        <h1>Prediction Evaluator</h1>
        <p>
          Load pre-computed classifier predictions and see where the model decides, errs or abstains. Move the
          confidence threshold to trade coverage (how much gets automated) for accuracy (how often automation is right).
        </p>
      </header>
      <Workbench samples={samples} />
    </main>
  );
}
