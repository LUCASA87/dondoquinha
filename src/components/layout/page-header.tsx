interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="border-l-4 border-brand-red pl-4">
        <h1 className="font-serif text-xl font-bold text-brand-black sm:text-2xl">{title}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-brand-black/60">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
