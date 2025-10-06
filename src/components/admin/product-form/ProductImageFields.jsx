import { Button } from '../../ui/button'
import ImageUrlField from '../ImageUrlField'

export default function ProductImageFields({
  images,
  onImageChange,
  onAddImage,
  onRemoveImage,
  onPreviewImage,
  notice,
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium">Product Images</label>
        <Button type="button" variant="outline" size="sm" onClick={onAddImage}>
          Add Image
        </Button>
      </div>
      <div className="space-y-2">
        {images.map((image, index) => (
          <ImageUrlField
            key={index}
            value={image}
            onChange={(value) => onImageChange(index, value)}
            placeholder={`Image URL ${index + 1}`}
            onPreview={onPreviewImage}
            onRemove={images.length > 1 ? () => onRemoveImage(index) : undefined}
            hideInput
          />
        ))}
      </div>
      {notice && <p className="text-xs text-purple-700 mt-2">{notice}</p>}
      <p className="text-sm text-gray-500 mt-1">
        Add multiple images for your product. The first image will be the primary image.
      </p>
    </div>
  )
}
