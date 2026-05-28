import React from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
}

function PageHeader({ title, subtitle }: PageHeaderProps): React.JSX.Element {
  return (
    <div className="px-10 pt-12 flex-shrink-0">
      <h1
        className="text-[28px] font-semibold text-[#1d1d1f] leading-[1.14] tracking-[0.196px]"
        style={{ fontFamily: "'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          className="mt-2 text-[14px] tracking-[-0.224px]"
          style={{
            color: 'rgba(0,0,0,0.48)',
            fontFamily: "'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
          }}
        >
          {subtitle}
        </p>
      )}
      <div className="mt-6 h-px bg-black/[0.06]" />
    </div>
  )
}

export default PageHeader
