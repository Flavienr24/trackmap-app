// Re-export shadcn/ui Select components with TrackMap utility wrapper
export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from '@/components/ui/select'

// Keep legacy interface for backward compatibility
export interface SelectOption {
  value: string
  label: string
}