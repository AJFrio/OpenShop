import { Fragment } from 'react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Switch } from '../../ui/switch'
import ImageUrlField from '../ImageUrlField'

export default function VariantGroup({
  id,
  enabled,
  onToggle,
  title,
  description,
  styleLabel,
  styleValue,
  onStyleChange,
  stylePlaceholder,
  variants,
  onAddVariant,
  onVariantChange,
  onVariantRemove,
  emptyMessage,
  priceLabel,
  namePlaceholder,
  onPreviewImage,
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Switch id={id} checked={enabled} onCheckedChange={onToggle} />
        <label htmlFor={id} className="text-sm text-gray-700 select-none">
          {description}
        </label>
      </div>
      {enabled && (
        <Fragment>
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <div>
            <label className="block text-sm font-medium mb-2">{styleLabel}</label>
            <Input
              value={styleValue}
              onChange={(event) => onStyleChange(event.target.value)}
              placeholder={stylePlaceholder}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium">Variant Picker</label>
            <Button type="button" variant="outline" size="sm" onClick={onAddVariant}>
              Add Variant
            </Button>
          </div>
          <div className="grid grid-cols-12 gap-2 text-xs text-gray-600 px-1">
            <div className="col-span-3">Variant name</div>
            <div className="col-span-4">Selector image</div>
            <div className="col-span-4">Display image</div>
          </div>
          {variants.length === 0 ? (
            <p className="text-sm text-gray-500">{emptyMessage}</p>
          ) : (
            <div className="space-y-2">
              {variants.map((variant, index) => (
                <div key={variant.id || index} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    <Input
                      value={variant.name}
                      onChange={(event) => onVariantChange(index, 'name', event.target.value)}
                      placeholder={namePlaceholder}
                    />
                  </div>
                  <div className="col-span-4">
                    <ImageUrlField
                      value={variant.selectorImageUrl || ''}
                      onChange={(value) => onVariantChange(index, 'selectorImageUrl', value)}
                      placeholder="Selector image URL"
                      onPreview={onPreviewImage}
                      hideInput
                    />
                  </div>
                  <div className="col-span-4">
                    <ImageUrlField
                      value={variant.displayImageUrl || ''}
                      onChange={(value) => onVariantChange(index, 'displayImageUrl', value)}
                      placeholder="Display image URL"
                      onPreview={onPreviewImage}
                      hideInput
                    />
                  </div>
                  <div className="col-span-12 grid grid-cols-12 gap-2 items-center">
                    <label className="col-span-3 flex items-center gap-2 text-sm text-gray-700">
                      <Switch
                        checked={!!variant.hasCustomPrice}
                        onCheckedChange={(value) => onVariantChange(index, 'hasCustomPrice', value)}
                      />
                      {priceLabel}
                    </label>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={!variant.hasCustomPrice}
                        value={variant.price ?? ''}
                        onChange={(event) => onVariantChange(index, 'price', event.target.value)}
                        placeholder="Variant price"
                      />
                    </div>
                  </div>
                  <div className="col-span-1 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="px-3"
                      onClick={() => onVariantRemove(index)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Fragment>
      )}
    </div>
  )
}
