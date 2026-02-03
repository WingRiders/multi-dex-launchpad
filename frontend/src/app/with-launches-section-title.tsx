type WithLaunchesSectionTitleProps = {
  title: string
  wrap?: boolean
  children?: React.ReactNode
}

export const WithLaunchesSectionTitle = ({
  title,
  wrap,
  children,
}: WithLaunchesSectionTitleProps) => {
  if (!wrap) return children
  return (
    <div className="space-y-4">
      <h2 className="font-bold text-4xl">{title}</h2>
      {children}
    </div>
  )
}
