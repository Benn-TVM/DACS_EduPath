import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AppFaIcon, appIcons } from '../../../components/icons/font-awesome'
import { useRoadmap } from '../hooks/useRoadmap'
import type { RoadmapRecord } from '../hooks/useRoadmap'
import { AppSidebar, AppTopbar } from '../student-layout'
import '../styles/roadmap.css'

const QUICK_SUGGESTIONS = [
  'Lộ trình Frontend Developer',
  'Lộ trình Data Scientist',
  'Lộ trình Backend với Python',
  'Lộ trình DevOps Engineer',
  'Lộ trình AI/Machine Learning',
  'Lộ trình Full-stack Developer',
]

export function RoadmapPage() {
  const [inputText, setInputText] = useState('')
  const {
    roadmapList,
    activeRoadmap,
    isGenerating,
    isLoading,
    errorText,
    successText,
    generateRoadmap,
    loadRoadmapDetail,
    toggleStepComplete,
    deleteRoadmap,
    clearActiveRoadmap,
  } = useRoadmap()

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = inputText.trim()
    if (!trimmed) return
    await generateRoadmap(trimmed)
  }

  function handleSuggestionClick(suggestion: string) {
    setInputText(suggestion)
  }

  function handleViewHistory(roadmapId: number) {
    void loadRoadmapDetail(roadmapId)
  }

  function handleBackToPrompt() {
    clearActiveRoadmap()
    setInputText('')
  }

  return (
    <div className="roadmap-page">
      <AppSidebar active="roadmap" />

      <main className="roadmap-main">
        <AppTopbar />

        <div className="roadmap-content">
          {errorText ? <div className="roadmap-error">{errorText}</div> : null}
          {successText && !activeRoadmap ? <div className="roadmap-success">{successText}</div> : null}

          {isGenerating ? (
            <GeneratingState />
          ) : isLoading ? (
            <GeneratingState />
          ) : activeRoadmap ? (
            <RoadmapResult
              roadmap={activeRoadmap}
              onToggleStep={(stepId, completed) =>
                void toggleStepComplete(activeRoadmap.id, stepId, completed)
              }
              onNewRoadmap={handleBackToPrompt}
              onDelete={() => void deleteRoadmap(activeRoadmap.id)}
            />
          ) : (
            <>
              <PromptInput
                inputText={inputText}
                setInputText={setInputText}
                onSubmit={handleGenerate}
                onSuggestionClick={handleSuggestionClick}
              />

              {roadmapList.length > 0 ? (
                <RoadmapHistory
                  items={roadmapList}
                  onView={handleViewHistory}
                  onDelete={(id) => void deleteRoadmap(id)}
                />
              ) : null}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function PromptInput({
  inputText,
  setInputText,
  onSubmit,
  onSuggestionClick,
}: {
  inputText: string
  setInputText: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onSuggestionClick: (suggestion: string) => void
}) {
  return (
    <section className="roadmap-prompt">
      <div className="roadmap-prompt__header">
        <div className="roadmap-prompt__icon">
          <AppFaIcon icon={appIcons.ai} />
        </div>
        <h1>Lộ trình học tập thông minh</h1>
        <p>Mô tả mục tiêu nghề nghiệp hoặc dán link Job Description để AI tạo lộ trình cá nhân hóa cho bạn.</p>
      </div>

      <div className="roadmap-form-container">
        <form className="roadmap-form" onSubmit={onSubmit}>
          <textarea
            className="roadmap-form__textarea"
            placeholder="Ví dụ: Tôi muốn trở thành Frontend Developer..."
            rows={3}
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
          />
          <div className="roadmap-form__actions">
            <button
              className="roadmap-form__submit"
              type="submit"
              disabled={!inputText.trim()}
              title="Tạo lộ trình AI"
            >
              <AppFaIcon icon={appIcons.ai} />
              <span>Tạo lộ trình</span>
            </button>
          </div>
        </form>

        <div className="roadmap-prompt__suggestions">
          {QUICK_SUGGESTIONS.slice(0, 4).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSuggestionClick(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

function GeneratingState() {
  return (
    <div className="roadmap-generating">
      <div className="roadmap-generating__spinner" />
      <h2>AI đang phân tích yêu cầu của bạn...</h2>
      <p>Quá trình này có thể mất 10-30 giây. Đang quét cơ sở dữ liệu khóa học và thiết kế lộ trình tối ưu.</p>
    </div>
  )
}

function RoadmapResult({
  roadmap,
  onToggleStep,
  onNewRoadmap,
  onDelete,
}: {
  roadmap: RoadmapRecord
  onToggleStep: (stepId: number, completed: boolean) => void
  onNewRoadmap: () => void
  onDelete: () => void
}) {
  const completedCount = roadmap.steps.filter((step) => step.is_completed).length
  const totalSteps = roadmap.steps.length
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0

  return (
    <div className="roadmap-result">
      <header className="roadmap-result__header">
        <h1>{roadmap.title}</h1>
        <p>
          <AppFaIcon icon={appIcons.target} /> Mục tiêu: {roadmap.target_role || 'Chưa xác định'} · Tiến độ:{' '}
          {completedCount}/{totalSteps} bước ({progressPercent}%)
        </p>

        {roadmap.extracted_skills.length > 0 ? (
          <div className="roadmap-result__skills">
            {roadmap.extracted_skills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        ) : null}

        <div className="roadmap-result__actions">
          <button type="button" onClick={onNewRoadmap}>
            <AppFaIcon icon={appIcons.plus} /> Tạo lộ trình mới
          </button>
          <button type="button" onClick={onDelete}>
            <AppFaIcon icon={appIcons.delete} /> Xóa lộ trình
          </button>
        </div>
      </header>

      <div className="roadmap-timeline">
        {roadmap.steps.map((step) => (
          <article
            key={step.id}
            className={`roadmap-step${step.is_completed ? ' is-completed' : ''}`}
          >
            <div className="roadmap-step__marker">
              {step.is_completed ? <AppFaIcon icon={appIcons.check} /> : step.order}
            </div>

            <div className="roadmap-step__head">
              <h3>{step.phase_name}</h3>
              <button
                className="roadmap-step__check"
                type="button"
                aria-label={
                  step.is_completed
                    ? `Bỏ đánh dấu ${step.phase_name}`
                    : `Hoàn thành ${step.phase_name}`
                }
                onClick={() => onToggleStep(step.id, !step.is_completed)}
              >
                <AppFaIcon icon={appIcons.check} />
              </button>
            </div>

            {step.description ? (
              <p className="roadmap-step__desc">{step.description}</p>
            ) : null}

            {step.skills.length > 0 ? (
              <div className="roadmap-step__skills">
                {step.skills.map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>
            ) : null}

            {step.course ? (
              <Link
                className="roadmap-step__course"
                to={`/courses/${step.course.id}`}
              >
                <div className="roadmap-step__course-icon"><AppFaIcon icon={appIcons.course} /></div>
                <div className="roadmap-step__course-info">
                  <strong>{step.course.title}</strong>
                  <small>{step.course.provider}</small>
                </div>
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  )
}

function RoadmapHistory({
  items,
  onView,
  onDelete,
}: {
  items: { id: number; title: string; target_role: string; step_count: number; completed_count: number; created_at: string }[]
  onView: (id: number) => void
  onDelete: (id: number) => void
}) {
  return (
    <section className="roadmap-history">
      <h2><AppFaIcon icon={appIcons.checklist} /> Lộ trình đã tạo</h2>
      <div className="roadmap-history__list">
        {items.map((item) => {
          const progressPercent =
            item.step_count > 0
              ? Math.round((item.completed_count / item.step_count) * 100)
              : 0

          return (
            <div
              key={item.id}
              className="roadmap-history__item"
              role="button"
              tabIndex={0}
              onClick={() => onView(item.id)}
              onKeyDown={(e) => e.key === 'Enter' && onView(item.id)}
            >
              <div className="roadmap-history__item-info">
                <h3>{item.title}</h3>
                <p>
                  {item.target_role || 'Chưa xác định'} ·{' '}
                  {item.completed_count}/{item.step_count} bước
                </p>
              </div>

              <div className="roadmap-history__item-meta">
                <div className="roadmap-history__item-progress">
                  <span style={{ width: `${progressPercent}%` }} />
                </div>
                <button
                  className="roadmap-history__item-delete"
                  type="button"
                  aria-label={`Xóa ${item.title}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    onDelete(item.id)
                  }}
                >
                  <AppFaIcon icon={appIcons.delete} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
