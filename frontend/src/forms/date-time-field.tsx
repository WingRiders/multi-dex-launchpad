import {CalendarIcon} from 'lucide-react'
import {useState} from 'react'
import {Button} from '@/components/ui/button'
import {Calendar} from '@/components/ui/calendar'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover'
import {ScrollArea, ScrollBar} from '@/components/ui/scroll-area'
import {formatDateTime} from '@/helpers/format'
import {cn} from '@/lib/utils'
import {useFieldContext} from './context'

type DateTimeFieldProps = {
  label: string
  description?: string
}

export const DateTimeField = ({label, description}: DateTimeFieldProps) => {
  const field = useFieldContext<Date | undefined>()

  const [isOpen, setIsOpen] = useState(false)

  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      field.handleChange(selectedDate)
    }
  }

  const handleTimeChange = (type: 'hour' | 'minute', value: string) => {
    if (field.state.value) {
      const newDate = new Date(field.state.value)
      if (type === 'hour') {
        newDate.setHours(parseInt(value, 10))
      } else if (type === 'minute') {
        newDate.setMinutes(parseInt(value, 10))
      }
      field.handleChange(newDate)
    }
  }

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      {description && <FieldDescription>{description}</FieldDescription>}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !field.state.value && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {field.state.value ? (
              formatDateTime(field.state.value)
            ) : (
              <span>MM/DD/YYYY HH:mm</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <div className="sm:flex">
            <Calendar
              mode="single"
              selected={field.state.value}
              onSelect={handleDateSelect}
            />
            <div className="flex flex-col divide-y sm:h-[300px] sm:flex-row sm:divide-x sm:divide-y-0">
              <ScrollArea className="w-64 sm:w-auto">
                <div className="flex p-2 sm:flex-col">
                  {Array.from({length: 24}, (_, i) => i)
                    .reverse()
                    .map((hour) => (
                      <Button
                        key={hour}
                        size="icon"
                        variant={
                          field.state.value &&
                          field.state.value.getHours() === hour
                            ? 'default'
                            : 'ghost'
                        }
                        className="aspect-square shrink-0 sm:w-full"
                        onClick={() =>
                          handleTimeChange('hour', hour.toString())
                        }
                      >
                        {hour}
                      </Button>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" className="sm:hidden" />
              </ScrollArea>
              <ScrollArea className="w-64 sm:w-auto">
                <div className="flex p-2 sm:flex-col">
                  {Array.from({length: 12}, (_, i) => i * 5).map((minute) => (
                    <Button
                      key={minute}
                      size="icon"
                      variant={
                        field.state.value &&
                        field.state.value.getMinutes() === minute
                          ? 'default'
                          : 'ghost'
                      }
                      className="aspect-square shrink-0 sm:w-full"
                      onClick={() =>
                        handleTimeChange('minute', minute.toString())
                      }
                    >
                      {minute.toString().padStart(2, '0')}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="sm:hidden" />
              </ScrollArea>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
