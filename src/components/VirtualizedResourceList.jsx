import React from 'react';
import { Virtuoso } from 'react-virtuoso';
import { lighten } from '../utils/colors';

/**
 * VirtualizedResourceList - Efficiently renders large lists of resources
 *
 * Uses react-virtuoso for smooth scrolling and memory efficiency
 * Only renders visible items + small buffer
 */

const ResourceItemComponent = React.memo(({ resource, BARRIERS, THEME_COLORS, lighten }) => {
  return (
    <article className="bg-white border border-slate-200 rounded-3xl shadow-md/10 p-4 mb-3">
      <h3 className="font-medium leading-snug">{resource.title}</h3>
      <p className="text-xs text-slate-600 mt-1 line-clamp-3">{resource.description}</p>
      <div className="mt-2 flex flex-wrap gap-1 text-xs">
        {(resource.personas || []).map((p) => (
          <span key={p} className="inline-flex items-center rounded-full px-2.5 py-0.5 bg-slate-100 text-slate-700">
            {p}
          </span>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1 text-xs">
        {(resource.barriers || []).map((b) => {
          const barrier = BARRIERS.find(x => x.id === b);
          const label = barrier?.name || b;
          const color = barrier ? lighten(THEME_COLORS[barrier.themeId] || "#64748b", 0.6) : "#e5e7eb";
          return (
            <span key={b} style={{ background: color }} className="inline-flex items-center rounded-full border border-slate-300 px-2 py-0.5">
              {label}
            </span>
          );
        })}
      </div>
      <a className="mt-3 inline-flex text-sm rounded-md px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800" href={resource.url} target="_blank" rel="noreferrer">
        Open resource
      </a>
    </article>
  );
});
ResourceItemComponent.displayName = 'ResourceItemComponent';

export default function VirtualizedResourceList({
  resources,
  BARRIERS,
  THEME_COLORS,
  height = '100%',
  enableVirtualization = true
}) {
  // For small lists (< 50 items), don't virtualize - it's overkill
  if (!enableVirtualization || resources.length < 50) {
    return (
      <div className="space-y-3">
        {resources.map((r) => (
          <ResourceItemComponent
            key={r.id}
            resource={r}
            BARRIERS={BARRIERS}
            THEME_COLORS={THEME_COLORS}
            lighten={lighten}
          />
        ))}
      </div>
    );
  }

  // For large lists, use virtualization
  return (
    <Virtuoso
      style={{ height }}
      totalCount={resources.length}
      itemContent={(index) => (
        <ResourceItemComponent
          resource={resources[index]}
          BARRIERS={BARRIERS}
          THEME_COLORS={THEME_COLORS}
          lighten={lighten}
        />
      )}
      overscan={5} // Render 5 items above and below viewport
      increaseViewportBy={{ top: 200, bottom: 200 }} // Pre-render buffer
    />
  );
}
