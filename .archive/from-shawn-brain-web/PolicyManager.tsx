"""
정책 관리 UI 컴포넌트 - React

신경계 정책 배포, 모니터링, 롤백 관리
"""

import React, { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000'

interface Policy {
  id: number
  policy_id: string
  policy_name: string
  status: 'active' | 'inactive' | 'backup' | 'rollback'
  version: string
  expected_performance: number
  actual_performance: number | null
  degradation_threshold: number
  created_at: string
  deployed_at: string | null
  rolled_back_at: string | null
  description: string | null
}

export default function PolicyManager() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [activePolicy, setActivePolicy] = useState<string | null>(null)
  const [backupPolicies, setBackupPolicies] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [deploying, setDeploying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 정책 목록 조회
  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        setLoading(true)
        const response = await axios.get(`${API_URL}/api/policies`)
        setPolicies(response.data.policies)
        setActivePolicy(response.data.active_policy)
        setBackupPolicies(response.data.backup_policies)
        setError(null)
      } catch (err) {
        setError('정책을 불러올 수 없습니다')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchPolicies()
    const interval = setInterval(fetchPolicies, 15000) // 15초마다 갱신
    return () => clearInterval(interval)
  }, [])

  // 정책 배포
  const handleDeployPolicy = async (policyId: string) => {
    try {
      setDeploying(policyId)
      const response = await axios.post(
        `${API_URL}/api/policies/deploy`,
        { policy_id: policyId }
      )
      
      setSuccess(`✅ 정책 배포 성공: ${policyId}`)
      setActivePolicy(policyId)
      
      // 3초 후 메시지 제거
      setTimeout(() => setSuccess(null), 3000)
      
      // 정책 목록 새로고침
      const listResponse = await axios.get(`${API_URL}/api/policies`)
      setPolicies(listResponse.data.policies)
      
    } catch (err: any) {
      setError(err.response?.data?.error || '정책 배포 실패')
    } finally {
      setDeploying(null)
    }
  }

  // 정책 상태 배지
  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      active: '#10b981',
      inactive: '#9ca3af',
      backup: '#3b82f6',
      rollback: '#ef4444'
    }
    const labels = {
      active: '활성',
      inactive: '비활성',
      backup: '백업',
      rollback: '롤백'
    }

    return (
      <span style={{
        display: 'inline-block',
        padding: '4px 12px',
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

  // 성능 비교 표시
  const PerformanceComparison = ({ policy }: { policy: Policy }) => {
    if (!policy.actual_performance) {
      return (
        <div style={{ fontSize: '12px', color: '#999' }}>
          (아직 성능 측정 안 됨)
        </div>
      )
    }

    const diff = policy.actual_performance - policy.expected_performance
    const color = diff >= 0 ? '#10b981' : '#ef4444'
    const arrow = diff >= 0 ? '📈' : '📉'

    return (
      <div style={{ fontSize: '12px' }}>
        <div>예상: {policy.expected_performance.toFixed(1)}%</div>
        <div>실제: {policy.actual_performance.toFixed(1)}%</div>
        <div style={{ color, fontWeight: 'bold' }}>
          {arrow} {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
        </div>
      </div>
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
        ⚙️ 정책 관리
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
          ❌ {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          backgroundColor: '#dcfce7',
          border: '1px solid #86efac',
          borderRadius: '6px',
          color: '#166534'
        }}>
          {success}
        </div>
      )}

      {/* 현재 활성 정책 정보 */}
      {activePolicy && (
        <div style={{
          padding: '16px',
          backgroundColor: '#eff6ff',
          border: '2px solid #3b82f6',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: '#0c4a6e'
          }}>
            🔵 현재 활성 정책
          </div>
          {policies
            .filter(p => p.policy_id === activePolicy)
            .map(policy => (
              <div key={policy.id} style={{ fontSize: '12px', color: '#0c4a6e' }}>
                <div>ID: {policy.policy_id}</div>
                <div>이름: {policy.policy_name}</div>
                <div>버전: {policy.version}</div>
                {policy.deployed_at && (
                  <div>배포: {new Date(policy.deployed_at).toLocaleString()}</div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* 정책 목록 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {policies.map(policy => (
          <div
            key={policy.id}
            style={{
              padding: '16px',
              border: policy.status === 'active' ? '2px solid #3b82f6' : '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: policy.status === 'active' ? '#f0f9ff' : 'white'
            }}
          >
            {/* 정책 헤더 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start',
              marginBottom: '12px'
            }}>
              <div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#111827',
                  marginBottom: '4px'
                }}>
                  {policy.policy_name}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#999'
                }}>
                  {policy.policy_id}
                </div>
              </div>
              <StatusBadge status={policy.status} />
            </div>

            {/* 정책 설명 */}
            {policy.description && (
              <div style={{
                fontSize: '12px',
                color: '#666',
                marginBottom: '12px',
                paddingBottom: '12px',
                borderBottom: '1px solid #e5e7eb'
              }}>
                {policy.description}
              </div>
            )}

            {/* 성능 메트릭 */}
            <div style={{
              backgroundColor: policy.status === 'active' ? '#ecf0ff' : '#f9fafb',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '12px',
              fontSize: '12px'
            }}>
              <PerformanceComparison policy={policy} />
            </div>

            {/* 세부 정보 */}
            <div style={{
              fontSize: '11px',
              color: '#999',
              marginBottom: '12px',
              lineHeight: '1.6'
            }}>
              <div>버전: {policy.version}</div>
              <div>롤백 임계값: {policy.degradation_threshold}%</div>
              {policy.created_at && (
                <div>생성: {new Date(policy.created_at).toLocaleDateString()}</div>
              )}
            </div>

            {/* 배포 버튼 */}
            {policy.status !== 'active' && (
              <button
                onClick={() => handleDeployPolicy(policy.policy_id)}
                disabled={deploying === policy.policy_id}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: deploying === policy.policy_id ? '#d1d5db' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  cursor: deploying === policy.policy_id ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => {
                  if (deploying !== policy.policy_id) {
                    e.currentTarget.style.backgroundColor = '#2563eb'
                  }
                }}
                onMouseOut={(e) => {
                  if (deploying !== policy.policy_id) {
                    e.currentTarget.style.backgroundColor = '#3b82f6'
                  }
                }}
              >
                {deploying === policy.policy_id ? '배포 중...' : '🚀 배포'}
              </button>
            )}

            {policy.status === 'active' && (
              <div style={{
                padding: '8px',
                backgroundColor: '#dcfce7',
                borderRadius: '4px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#166534'
              }}>
                ✅ 현재 활성화됨
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 백업 정책 요약 */}
      {backupPolicies.length > 0 && (
        <div style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#f3f4f6',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#666'
        }}>
          <strong>백업 정책:</strong> {backupPolicies.join(', ')}
          <div style={{ marginTop: '4px', fontSize: '11px' }}>
            성능 저하 시 자동 롤백됩니다
          </div>
        </div>
      )}
    </div>
  )
}
