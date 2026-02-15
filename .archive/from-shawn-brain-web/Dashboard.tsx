"""
통합 대시보드 - React

신경계 모니터링, 모델 관리, 정책 배포, 알림 관리 통합
"""

import React, { useState, useEffect } from 'react'
import axios from 'axios'
import ModelSelector from './ModelSelector'
import PolicyManager from './PolicyManager'
import AlertPanel from './AlertPanel'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000'

interface NeuralStatus {
  timestamp: string
  neural_levels: Record<string, string>
  health: string
  availability: string
  uptime_hours: number
}

interface Performance {
  availability: string
  avg_latency_ms: number
  token_efficiency: number
  models_operational: number
  total_models: number
  timestamp: string
}

interface Log {
  id: number
  timestamp: string
  level: string
  component: string
  message: string
}

export default function Dashboard() {
  const [neuralStatus, setNeuralStatus] = useState<NeuralStatus | null>(null)
  const [performance, setPerformance] = useState<Performance | null>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'models' | 'policies' | 'alerts'>('overview')

  // 데이터 갱신
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusRes, perfRes, logsRes] = await Promise.all([
          axios.get(`${API_URL}/api/neural/status`),
          axios.get(`${API_URL}/api/performance/overview`),
          axios.get(`${API_URL}/api/logs?limit=10`)
        ])

        setNeuralStatus(statusRes.data)
        setPerformance(perfRes.data)
        setLogs(logsRes.data.logs)
      } catch (err) {
        console.error('데이터 갱신 실패:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  // 신경 모니터
  const NeuralMonitor = () => {
    if (!neuralStatus) return null

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        {['L1', 'L2', 'L3', 'L4'].map(level => (
          <div
            key={level}
            style={{
              padding: '12px',
              backgroundColor: '#eff6ff',
              border: '2px solid #3b82f6',
              borderRadius: '8px',
              textAlign: 'center'
            }}
          >
            <div style={{
              fontSize: '12px',
              color: '#666',
              marginBottom: '6px'
            }}>
              {level}
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#0c4a6e',
              marginBottom: '4px'
            }}>
              {neuralStatus.neural_levels[level] || '-'}
            </div>
            <div style={{
              fontSize: '10px',
              color: '#999'
            }}>
              (신경 레벨)
            </div>
          </div>
        ))}
      </div>
    )
  }

  // 성능 차트
  const PerformanceChart = () => {
    if (!performance) return null

    const parsePercentage = (str: string) => {
      return parseFloat(str.replace('%', ''))
    }

    const metrics = [
      { label: '가용성', value: parsePercentage(performance.availability), unit: '%' },
      { label: 'token 효율성', value: performance.token_efficiency * 100, unit: '%' },
      { label: '평균 지연', value: performance.avg_latency_ms, unit: 'ms' },
      { label: '작동 모델', value: performance.models_operational, unit: `/${performance.total_models}` }
    ]

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        {metrics.map(metric => (
          <div
            key={metric.label}
            style={{
              padding: '12px',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          >
            <div style={{
              fontSize: '12px',
              color: '#666',
              marginBottom: '6px'
            }}>
              {metric.label}
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '4px'
            }}>
              {metric.value.toFixed(1)}{metric.unit}
            </div>
            <div style={{
              height: '4px',
              backgroundColor: '#e5e7eb',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div
                style={{
                  height: '100%',
                  backgroundColor: '#3b82f6',
                  width: `${Math.min((metric.value / 100) * 100, 100)}%`,
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // 로그 뷰어
  const LogViewer = () => {
    const levelColors = {
      info: '#3b82f6',
      warning: '#f59e0b',
      error: '#ef4444',
      debug: '#8b5cf6'
    }

    return (
      <div style={{
        backgroundColor: '#1f2937',
        borderRadius: '8px',
        padding: '12px',
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#e5e7eb',
        maxHeight: '200px',
        overflowY: 'auto'
      }}>
        {logs.map((log, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: '4px',
              color: levelColors[log.level as keyof typeof levelColors] || '#e5e7eb'
            }}
          >
            [{new Date(log.timestamp).toLocaleTimeString()}] [{log.level.toUpperCase()}] {log.component}: {log.message}
          </div>
        ))}
      </div>
    )
  }

  // 탭 네비게이션
  const TabNavigation = () => {
    const tabs = [
      { id: 'overview', label: '📊 개요', icon: 'overview' },
      { id: 'models', label: '🤖 모델', icon: 'models' },
      { id: 'policies', label: '⚙️ 정책', icon: 'policies' },
      { id: 'alerts', label: '🚨 알림', icon: 'alerts' }
    ]

    return (
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '12px',
        flexWrap: 'wrap'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === tab.id ? '#3b82f6' : 'white',
              color: activeTab === tab.id ? 'white' : '#666',
              border: activeTab === tab.id ? 'none' : '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#666'
      }}>
        로딩 중...
      </div>
    )
  }

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '20px'
    }}>
      {/* 헤더 */}
      <div style={{
        marginBottom: '30px',
        paddingBottom: '20px',
        borderBottom: '3px solid #3b82f6'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '8px'
        }}>
          🧠 SHawn-Brain 신경계 대시보드
        </h1>
        <div style={{
          fontSize: '14px',
          color: '#666'
        }}>
          v5.3.0 | {new Date().toLocaleString()}
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <TabNavigation />

      {/* Overview 탭 */}
      {activeTab === 'overview' && (
        <div>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '12px',
            color: '#111827'
          }}>
            신경계 상태
          </h2>
          <NeuralMonitor />

          <h2 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '12px',
            color: '#111827',
            marginTop: '20px'
          }}>
            성능 메트릭
          </h2>
          <PerformanceChart />

          <h2 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '12px',
            color: '#111827',
            marginTop: '20px'
          }}>
            실시간 로그
          </h2>
          <LogViewer />
        </div>
      )}

      {/* Models 탭 */}
      {activeTab === 'models' && <ModelSelector />}

      {/* Policies 탭 */}
      {activeTab === 'policies' && <PolicyManager />}

      {/* Alerts 탭 */}
      {activeTab === 'alerts' && <AlertPanel />}
    </div>
  )
}
