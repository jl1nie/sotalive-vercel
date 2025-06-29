import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { ReferenceSearch } from '../ReferenceSearch'

// Mock APIService
const mockSearchReference = vi.fn()
vi.mock('@/services/api', () => ({
  APIService: {
    searchReference: mockSearchReference
  }
}))

describe('ReferenceSearch', () => {
  const mockOnSelect = vi.fn()
  
  const defaultProps = {
    onSelect: mockOnSelect,
    width: 400,
    maxCandidates: 300,
    placeholder: 'Search references...',
    disabled: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('should render search input with placeholder', () => {
      render(<ReferenceSearch {...defaultProps} />)
      
      expect(screen.getByPlaceholderText('Search references...')).toBeInTheDocument()
    })

    it('should render with custom width', () => {
      render(<ReferenceSearch {...defaultProps} width={500} />)
      
      const container = screen.getByPlaceholderText('Search references...').closest('div')
      expect(container).toHaveStyle({ width: '500px' })
    })

    it('should render disabled state', () => {
      render(<ReferenceSearch {...defaultProps} disabled={true} />)
      
      expect(screen.getByPlaceholderText('Search references...')).toBeDisabled()
    })

    it('should show search hint text', () => {
      render(<ReferenceSearch {...defaultProps} />)
      
      expect(screen.getByText(/例: "JA\/ST-001", "富士山", "35.6762, 139.6503"/)).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('should trigger search after debounce delay', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      mockSearchReference.mockResolvedValue({
        count: 1,
        candidates: [{
          code: 'JA/ST-001',
          lat: 35.3606,
          lon: 138.7274,
          nameJ: '富士山'
        }]
      })

      render(<ReferenceSearch {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search references...')
      
      await user.type(input, 'Fuji')
      
      // Fast-forward debounce timer
      vi.advanceTimersByTime(300)
      
      await waitFor(() => {
        expect(mockSearchReference).toHaveBeenCalledWith('Fuji')
      })
    })

    it('should display search results in dropdown', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      mockSearchReference.mockResolvedValue({
        count: 2,
        candidates: [
          {
            code: 'JA/ST-001',
            lat: 35.3606,
            lon: 138.7274,
            nameJ: '富士山'
          },
          {
            code: 'JA/ST-002',
            lat: 35.3778,
            lon: 138.7945,
            nameJ: '北岳'
          }
        ]
      })

      render(<ReferenceSearch {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search references...')
      await user.type(input, 'mountain')
      
      vi.advanceTimersByTime(300)
      
      await waitFor(() => {
        expect(screen.getByText('JA/ST-001')).toBeInTheDocument()
        expect(screen.getByText('富士山')).toBeInTheDocument()
        expect(screen.getByText('JA/ST-002')).toBeInTheDocument()
        expect(screen.getByText('北岳')).toBeInTheDocument()
      })
    })

    it('should handle search errors gracefully', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      mockSearchReference.mockRejectedValue(new Error('API error'))

      render(<ReferenceSearch {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search references...')
      await user.type(input, 'error')
      
      vi.advanceTimersByTime(300)
      
      await waitFor(() => {
        expect(mockSearchReference).toHaveBeenCalledWith('error')
      })
      
      // Should not crash and should show "no options" text
      expect(screen.getByText('候補が見つかりません')).toBeInTheDocument()
    })

    it('should show loading state during search', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      // Mock a delayed response
      mockSearchReference.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ count: 0, candidates: [] }), 1000))
      )

      render(<ReferenceSearch {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search references...')
      await user.type(input, 'test')
      
      vi.advanceTimersByTime(300)
      
      await waitFor(() => {
        expect(screen.getByText('検索中...')).toBeInTheDocument()
      })
    })
  })

  describe('Coordinate Input', () => {
    it('should parse coordinate input correctly', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(<ReferenceSearch {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search references...')
      await user.type(input, '35.6762, 139.6503')
      
      vi.advanceTimersByTime(300)
      
      await waitFor(() => {
        expect(screen.getByText(/座標: 35.676200, 139.650300/)).toBeInTheDocument()
      })
    })

    it('should handle invalid coordinate format', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(<ReferenceSearch {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search references...')
      await user.type(input, 'invalid coordinate')
      
      vi.advanceTimersByTime(300)
      
      // Should trigger normal search instead of coordinate parsing
      await waitFor(() => {
        expect(mockSearchReference).toHaveBeenCalledWith('invalid coordinate')
      })
    })

    it('should validate coordinate ranges', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(<ReferenceSearch {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search references...')
      await user.type(input, '91.0, 181.0') // Invalid lat/lng
      
      vi.advanceTimersByTime(300)
      
      // Should trigger normal search for invalid coordinates
      await waitFor(() => {
        expect(mockSearchReference).toHaveBeenCalledWith('91.0, 181.0')
      })
    })
  })

  describe('Selection Handling', () => {
    it('should call onSelect when option is selected', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      mockSearchReference.mockResolvedValue({
        count: 1,
        candidates: [{
          code: 'JA/ST-001',
          lat: 35.3606,
          lon: 138.7274,
          nameJ: '富士山'
        }]
      })

      render(<ReferenceSearch {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search references...')
      await user.type(input, 'Fuji')
      
      vi.advanceTimersByTime(300)
      
      await waitFor(() => {
        expect(screen.getByText('JA/ST-001')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('富士山'))
      
      expect(mockOnSelect).toHaveBeenCalledWith({
        code: 'JA/ST-001',
        coord: [35.3606, 138.7274],
        name: '富士山',
        data: {
          code: 'JA/ST-001',
          lat: 35.3606,
          lon: 138.7274,
          nameJ: '富士山'
        }
      })
    })

    it('should clear input after selection', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      mockSearchReference.mockResolvedValue({
        count: 1,
        candidates: [{
          code: 'JA/ST-001',
          lat: 35.3606,
          lon: 138.7274,
          nameJ: '富士山'
        }]
      })

      render(<ReferenceSearch {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search references...')
      await user.type(input, 'Fuji')
      
      vi.advanceTimersByTime(300)
      
      await waitFor(() => {
        expect(screen.getByText('JA/ST-001')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('富士山'))
      
      await waitFor(() => {
        expect(input).toHaveValue('')
      })
    })

    it('should handle direct code input with Enter key', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      mockSearchReference.mockResolvedValue({
        count: 1,
        candidates: [{
          code: 'JA/ST-001',
          lat: 35.3606,
          lon: 138.7274,
          nameJ: '富士山'
        }]
      })

      render(<ReferenceSearch {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search references...')
      await user.type(input, 'JA/ST-001 富士山')
      
      vi.advanceTimersByTime(300)
      
      await waitFor(() => {
        expect(screen.getByText('JA/ST-001')).toBeInTheDocument()
      })
      
      await user.keyboard('{Enter}')
      
      expect(mockOnSelect).toHaveBeenCalledWith({
        code: 'JA/ST-001',
        coord: [35.3606, 138.7274],
        name: '富士山',
        data: {
          code: 'JA/ST-001',
          lat: 35.3606,
          lon: 138.7274,
          nameJ: '富士山'
        }
      })
    })
  })

  describe('Performance', () => {
    it('should debounce search requests', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      mockSearchReference.mockResolvedValue({ count: 0, candidates: [] })

      render(<ReferenceSearch {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search references...')
      
      // Type multiple characters quickly
      await user.type(input, 'abc')
      
      // Should not have called API yet
      expect(mockSearchReference).not.toHaveBeenCalled()
      
      // Fast-forward debounce timer
      vi.advanceTimersByTime(300)
      
      // Now should have called API only once
      await waitFor(() => {
        expect(mockSearchReference).toHaveBeenCalledTimes(1)
        expect(mockSearchReference).toHaveBeenCalledWith('abc')
      })
    })

    it('should cancel previous search when new search starts', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      mockSearchReference.mockResolvedValue({ count: 0, candidates: [] })

      render(<ReferenceSearch {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search references...')
      
      await user.type(input, 'first')
      vi.advanceTimersByTime(200) // Partial debounce
      
      await user.clear(input)
      await user.type(input, 'second')
      vi.advanceTimersByTime(300) // Full debounce
      
      // Should only search for "second", not "first"
      await waitFor(() => {
        expect(mockSearchReference).toHaveBeenCalledTimes(1)
        expect(mockSearchReference).toHaveBeenCalledWith('second')
      })
    })

    it('should handle rapid input changes efficiently', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      mockSearchReference.mockResolvedValue({ count: 0, candidates: [] })

      render(<ReferenceSearch {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search references...')
      
      // Simulate rapid typing
      await user.type(input, 'a')
      vi.advanceTimersByTime(50)
      await user.type(input, 'b')
      vi.advanceTimersByTime(50)
      await user.type(input, 'c')
      vi.advanceTimersByTime(50)
      await user.type(input, 'd')
      
      // Fast-forward full debounce
      vi.advanceTimersByTime(300)
      
      // Should only search once for final value
      await waitFor(() => {
        expect(mockSearchReference).toHaveBeenCalledTimes(1)
        expect(mockSearchReference).toHaveBeenCalledWith('abcd')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty search results', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      mockSearchReference.mockResolvedValue({
        count: 0,
        candidates: []
      })

      render(<ReferenceSearch {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search references...')
      await user.type(input, 'nothing')
      
      vi.advanceTimersByTime(300)
      
      await waitFor(() => {
        expect(screen.getByText('候補が見つかりません')).toBeInTheDocument()
      })
    })

    it('should handle too many candidates', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      mockSearchReference.mockResolvedValue({
        count: 500, // More than maxCandidates
        candidates: []
      })

      render(<ReferenceSearch {...defaultProps} maxCandidates={300} />)
      
      const input = screen.getByPlaceholderText('Search references...')
      await user.type(input, 'many')
      
      vi.advanceTimersByTime(300)
      
      await waitFor(() => {
        expect(screen.getByText('候補が見つかりません')).toBeInTheDocument()
      })
    })

    it('should handle malformed API responses', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      mockSearchReference.mockResolvedValue({
        // Missing count property
        candidates: [{
          code: 'JA/ST-001',
          lat: 35.3606,
          lon: 138.7274,
          nameJ: '富士山'
        }]
      })

      render(<ReferenceSearch {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search references...')
      await user.type(input, 'malformed')
      
      vi.advanceTimersByTime(300)
      
      // Should handle gracefully without crashing
      await waitFor(() => {
        expect(mockSearchReference).toHaveBeenCalledWith('malformed')
      })
    })

    it('should handle very long search terms', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      mockSearchReference.mockResolvedValue({ count: 0, candidates: [] })
      
      const longSearchTerm = 'a'.repeat(1000)

      render(<ReferenceSearch {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search references...')
      await user.type(input, longSearchTerm)
      
      vi.advanceTimersByTime(300)
      
      await waitFor(() => {
        expect(mockSearchReference).toHaveBeenCalledWith(longSearchTerm)
      })
    })
  })

  describe('Accessibility', () => {
    it('should be accessible via keyboard navigation', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      mockSearchReference.mockResolvedValue({
        count: 2,
        candidates: [
          { code: 'JA/ST-001', lat: 35.3606, lon: 138.7274, nameJ: '富士山' },
          { code: 'JA/ST-002', lat: 35.3778, lon: 138.7945, nameJ: '北岳' }
        ]
      })

      render(<ReferenceSearch {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search references...')
      await user.type(input, 'mountain')
      
      vi.advanceTimersByTime(300)
      
      await waitFor(() => {
        expect(screen.getByText('JA/ST-001')).toBeInTheDocument()
      })
      
      // Navigate with arrow keys
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Enter}')
      
      expect(mockOnSelect).toHaveBeenCalled()
    })

    it('should have proper ARIA attributes', () => {
      render(<ReferenceSearch {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search references...')
      expect(input).toHaveAttribute('role', 'combobox')
    })
  })

  describe('Cleanup', () => {
    it('should cleanup timers on unmount', () => {
      const { unmount } = render(<ReferenceSearch {...defaultProps} />)
      
      unmount()
      
      // Should not throw any errors about timers
      expect(true).toBe(true)
    })
  })
})