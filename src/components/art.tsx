import { Sparkles, Command, Layers, Workflow, PenLine, Search, Play } from 'lucide-react';
const icons = [Command, Search, Sparkles, Workflow, PenLine, Layers];
export function Art({
  theme = 'mint',
  index = 0,
  video = false,
}: {
  theme?: string;
  index?: number;
  video?: boolean;
}) {
  const Icon = icons[index % icons.length];
  return (
    <div className={`art ${theme}`} aria-hidden="true">
      <div className="art-orbit orbit-one" />
      <div className="art-orbit orbit-two" />
      <div className="art-glass">
        <Icon strokeWidth={1.15} />
      </div>
      <span className="art-caption">
        {video ? 'AI CLASS' : 'A LITTLE KNOWLEDGE. A BIG DIFFERENCE.'}
      </span>
      {video && (
        <span className="play-disc">
          <Play fill="currentColor" size={20} />
        </span>
      )}
    </div>
  );
}
