"""
알림 패널 UI 컴포넌트 - React

시스템 알림, 경고, 에러 메시지 표시 및 관리
"""

import React, { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000'

interface Alert {
  id: number
  alert_id: string
  timestamp: string
  level: 'info' | 'warning' | 'critical'
  title: string
  message: string
  source: string
  component: string
  resolved: boolean
  resolved_at: string | null
}

export default function AlertPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [unresolvedCount, setUnresolvedCount] = useState(0)
  const [criticalCount, setCriticalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState<'all' | 'info' | 'warning' | 'critical'>('all')
  const [showResolved, setShowResolved] = useState(false)

  // 알림 목록 조회
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true)
        const response = await axios.get(`${API_URL}/api/alerts`)
        setAlerts(response.data.alerts)
        setUnresolvedCount(response.data.unresolved_count)
        setCriticalCount(response.data.critical_count)
      } catch (err) {
        console.error('알림을 불러올 수 없습니다:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
    const interval = setInterval(fetchAlerts, 5000) // 5초마다 갱신
    return () => clearInterval(interval)
  }, [])

  // 알림 필터링
  const filteredAlerts = alerts.filter(alert => {
    const levelMatch = selectedLevel === 'all' || alert.level === selectedLevel
    const resolvedMatch = showResolved ? !alert.resolved : !alert.resolved
    return levelMatch && resolvedMatch
  })

  // 알림 아이콘
  const getAlertIcon = (level: string): string => {
    switch (level) {
      case 'info': return 'ℹ️'
      case 'warning': return '⚠️'
      case 'critical': return '🚨'
      default: return '📢'
    }
  }

  // 알림 색상
  const getAlertColor = (level: string): string => {
    switch (level) {
      case 'info': return '#3b82f6'
      case 'warning': return '#f59e0b'
      case 'critical': return '#ef4444'
      default: return '#6b7280'
    }
  }

  // 알림 배경색
  const getAlertBgColor = (level: string): string => {
    switch (level) {
      case 'info': return '#eff6ff'
      case 'warning': return '#fffbeb'
      case 'critical': return '#fef2f2'
      default: return '#f9fafb'
    }
  }

  // 알림 해결 표시
  const handleResolveAlert = async (alertId: string) => {
    // TODO: API 엔드포인트 추가 필요
    // PATCH /api/alerts/{alertId}/resolve
    try {
      // API 호출 후 로컬 상태 업데이트
      setAlerts(prev =>
        prev.map(alert =>
          alert.alert_id === alertId
            ? { ...alert, resolved: true, resolved_at: new Date().toISOString() }
            : alert
        )
      )
      setUnresolvedCount(Math.max(0, unresolvedCount - 1))
    } catch (err) {
      console.error('알림 해결 실패:', err)
    }
  }

  return (
    <div style={{
      backgroundColor: '#f9fafb',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#111827'
        }}>
          📢 시스템 알림
        </h2>
        
        {/* 알림 요약 */}
        <div style={{
          display: 'flex',
          gap: '12px',
          fontSize: '12px'
        }}>
          <div style={{
            padding: '6px 12px',
            backgroundColor: '#ef4444',
            color: 'white',
            borderRadius: '12px',
            fontWeight: 'bold'
          }}>
            🚨 {criticalCount} 긴급
          </div>
          <div style={{
            padding: '6px 12px',
            backgroundColor: '#f59e0b',
            color: 'white',
            borderRadius: '12px',
            fontWeight: 'bold'
          }}>
            ⚠️ {unresolvedCount} 미해결
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
        flexWrap: 'wrap'
      }}>
        {(['all', 'info', 'warning', 'critical'] as const).map(level => (
          <button
            key={level}
            onClick={() => setSelectedLevel(level)}
            style={{
              padding: '6px 12px',
              border: selectedLevel === level ? '2px solid #3b82f6' : '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: selectedLevel === level ? '#eff6ff' : 'white',
              color: selectedLevel === level ? '#3b82f6' : '#666',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: selectedLevel === level ? 'bold' : 'normal',
              transition: 'all 0.2s'
            }}
          >
            {level === 'all' ? '모두' : level === 'info' ? 'ℹ️ 정보' : level === 'warning' ? '⚠️ 경고' : '🚨 긴급'}
          </button>
        ))}

        <button
          onClick={() => setShowResolved(!showResolved)}
          style={{
            padding: '6px 12px',
            border: showResolved ? '2px solid #10b981' : '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: showResolved ? '#f0fdf4' : 'white',
            color: showResolved ? '#10b981' : '#666',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: showResolved ? 'bold' : 'normal',
            transition: 'all 0.2s'
          }}
        >
          ✅ 해결됨 표시
        </button>
      </div>

      {/* 알림 목록 */}
      <div style={{
        maxHeight: '500px',
        overflowY: 'auto'
      }}>
        {loading ? (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#999'
          }}>
            로딩 중...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#999'
          }}>
            {showResolved ? '해결된 알림이 없습니다' : '활성 알림이 없습니다'}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {filteredAlerts.map(alert => (
              <div
                key={alert.id}
                style={{
                  padding: '12px',
                  backgroundColor: getAlertBgColor(alert.level),
                  border: `1px solid ${getAlertColor(alert.level)}`,
                  borderRadius: '6px',
                  opacity: alert.resolved ? 0.6 : 1,
                  transition: 'all 0.2s'
                }}
              >
                {/* 알림 헤더 */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: '6px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      fontSize: '16px'
                    }}>
                      {getAlertIcon(alert.level)}
                    </span>
                    <div>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 'bold',
                        color: getAlertColor(alert.level)
                      }}>
                        {alert.title}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: '#999'
                      }}>
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  {!alert.resolved && (
                    <button
                      onClick={() => handleResolveAlert(alert.alert_id)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'transparent',
                        border: `1px solid ${getAlertColor(alert.level)}`,
                        color: getAlertColor(alert.level),
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = getAlertColor(alert.level)
                        e.currentTarget.style.color = 'white'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = getAlertColor(alert.level)
                      }}
                    >
                      ✓ 해결
                    </button>
                  )}
                </div>

                {/* 알림 메시지 */}
                <div style={{
                  fontSize: '12px',
                  color: '#333',
                  marginBottom: '8px',
                  lineHeight: '1.4'
                }}>
                  {alert.message}
                </div>

                {/* 알림 메타데이터 */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  fontSize: '11px',
                  color: '#999'
                }}>
                  <span>📍 {alert.source}</span>
                  <span>🔧 {alert.component}</span>
                  {alert.resolved && alert.resolved_at && (
                    <span>✅ {new Date(alert.resolved_at).toLocaleTimeString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 알림 통계 */}
      <div style={{
        marginTop: '16px',
        paddingTop: '16px',
        borderTop: '1px solid #e5e7eb',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: '12px',
        fontSize: '12px',
        color: '#666'
      }}>
        <div>
          <div style={{ fontWeight: 'bold', color: '#111827' }}>
            {alerts.length}
          </div>
          <div>총 알림</div>
        </div>
        <div>
          <div style={{ fontWeight: 'bold', color: '#ef4444' }}>
            {alerts.filter(a => a.level === 'critical').length}
          </div>
          <div>긴급</div>
        </div>
        <div>
          <div style={{ fontWeight: 'bold', color: '#f59e0b' }}>
            {alerts.filter(a => a.level === 'warning').length}
          </div>
          <div>경고</div>
        </div>
        <div>
          <div style={{ fontWeight: 'bold', color: '#10b981' }}>
            {alerts.filter(a => a.resolved).length}
          </div>
          <div>해결됨</div>
        </div>
      </div>
    </div>
  )
}
