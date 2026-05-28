import React from 'react'
import PageHeader from '../../components/PageHeader'
import TodoPanel from './TodoPanel'

function TodoPage(): React.JSX.Element {
  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Todo" subtitle="Keep track of what needs to get done." />
      <div className="px-10 mt-8 pb-10">
        <TodoPanel />
      </div>
    </div>
  )
}

export default TodoPage
