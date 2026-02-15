"""
모델 선택 UI 컴포넌트 - React

사용자가 신경 라우팅에 사용할 모델을 선택하고 관리
"""

import React, { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000'

interface Model {
  id: number
  name: string
  status: 'operational' | 'degraded' | 'down'
  success_rate: number
  avg_latency: number
  l1_score: number
  l2_score: number
  l3_score: number
  l4_score: number
}

interface SelectedModels {
  L1: string
  L2: string
  L3: string
  L4: string
}

export default function ModelSelector() {
  const [models, setModels] = useState<Model[]>([])
  const [selectedModels, setSelectedModels] = useState<SelectedModels>({
    L1: 'Groq',
    L2: 'Claude',
    L3: 'Gemini',
    L4: 'DeepSeek'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // 모델 목록 조회
  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true)
        const response = await axios.get(`${API_URL}/api/models`)
        setModels(response.data.models)
        setError(null)
      } catch (err) {
        setError('모델 목록을 불러올 수 없습니다')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchModels()
    const interval = setInterval(fetchModels, 10000) // 10초마다 갱신
    return () => clearInterval(interval)
  }, [])

  // 모델 선택 핸들러
  const handleModelChange = (level: keyof SelectedModels, modelName: string) => {
    setSelectedModels(prev => ({
      ...prev,
      [level]: modelName
    }))
    setSaved(false)
  }

  // 모델 선택 저장
  const handleSaveSelection = async () => {
    try {
      // API 호출로 선택사항 저장
      // TODO: /api/config/models 엔드포인트 추가 필요
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError('선택사항을 저장할 수 없습니다')
    }
  }

  // 모델 점수를 시각화 (0-10)
  const ScoreBar = ({ score }: { score: number }) => {
    const percentage = (score / 10) * 100
    const color = 
      score >= 9 ? '#10b981' :
      score >= 8 ? '#3b82f6' :
      score >= 7 ? '#f59e0b' :
      '#ef4444'

    return (
      <div style={{
        width: '100%',
        height: '6px',
        backgroundColor: '#e5e7eb',
        borderRadius: '3px',
        overflow: 'hidden'
      }}>
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: color,
            transition: 'width 0.3s ease'
          }}
        />
      </div>
    )
  }

  // 모델 상태 배지
  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      operational: '#10b981',
      degraded: '#f59e0b',
      down: '#ef4444'
    }
    const labels = {
      operational: '작동 중',
      degraded: '성능 저하',
      down: '다운'
    }

    return (
      <span style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '12px',
        backgroundColor: colors[status as keyof typeof colors],
        color: 'white',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  if (loading) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#666'
      }}>
        로딩 중...
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: '#f9fafb',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{
        fontSize: '20px',
        fontWeight: 'bold',
        marginBottom: '20px',
        color: '#111827'
      }}>
        📊 모델 선택기
      </h2>

      {error && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          backgroundColor: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '6px',
          color: '#991b1b'
        }}>
          ⚠️ {error}
        </div>
      )}

      {saved && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          backgroundColor: '#dcfce7',
          border: '1px solid #86efac',
          borderRadius: '6px',
          color: '#166534'
        }}>
          ✅ 선택사항이 저장되었습니다
        </div>
      )}

      {/* 신경 레벨별 모델 선택 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {(['L1', 'L2', 'L3', 'L4'] as const).map(level => {
          const levelNames = {
            L1: '뇌간 (기본)',
            L2: '변린계 (감정)',
            L3: '신피질 (인지)',
            L4: '신경망 (학습)'
          }

          return (
            <div
              key={level}
              style={{
                padding: '16px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: 'white'
              }}
            >
              <div style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#374151',
                marginBottom: '12px'
              }}>
                {levelNames[level]}
              </div>

              {/* 모델 선택 드롭다운 */}
              <select
                value={selectedModels[level]}
                onChange={(e) => handleModelChange(level, e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  marginBottom: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {models.map(model => (
                  <option key={model.id} value={model.name}>
                    {model.name}
                  </option>
                ))}
              </select>

              {/* 선택된 모델 정보 */}
              {models
                .filter(m => m.name === selectedModels[level])
                .map(model => (
                  <div key={model.id} style={{ fontSize: '12px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '8px'
                    }}>
                      <span>상태:</span>
                      <StatusBadge status={model.status} />
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                      color: '#666'
                    }}>
                      <span>성공률:</span>
                      <span>{model.success_rate.toFixed(1)}%</span>
                    </div>
                    <ScoreBar score={model.l1_score} />

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                      color: '#666',
                      marginTop: '8px'
                    }}>
                      <span>레이턴시:</span>
                      <span>{model.avg_latency.toFixed(0)}ms</span>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      marginTop: '8px',
                      fontSize: '11px'
                    }}>
                      <div>
                        <div style={{ color: '#666' }}>L1: {model.l1_score.toFixed(1)}</div>
                        <div style={{ color: '#666' }}>L2: {model.l2_score.toFixed(1)}</div>
                      </div>
                      <div>
                        <div style={{ color: '#666' }}>L3: {model.l3_score.toFixed(1)}</div>
                        <div style={{ color: '#666' }}>L4: {model.l4_score.toFixed(1)}</div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )
        })}
      </div>

      {/* 저장 버튼 */}
      <button
        onClick={handleSaveSelection}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 'bold',
          cursor: 'pointer',
          fontSize: '14px',
          transition: 'background-color 0.2s'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#2563eb'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = '#3b82f6'
        }}
      >
        💾 선택사항 저장
      </button>
    </div>
  )
}
