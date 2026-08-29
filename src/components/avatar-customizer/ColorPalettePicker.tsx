import React from 'react'
import { AvatarConfig } from '../../types/game'
import { CategoryKey } from './CategoryTabs'

export const SKIN_TONES = ['#ffd1a4', '#f5b080', '#e09865', '#ba6c48', '#8c4826', '#5c2d15', '#fdebd0']
export const HAIR_COLORS = [
  '#212529',
  '#495057',
  '#5c3a21',
  '#8b5a2b',
  '#d4a373',
  '#f4d06f',
  '#e03131',
  '#9c36b5',
  '#3b5bdb',
  '#099268',
  '#f06595',
  '#e9ecef',
]
export const FABRIC_COLORS = [
  '#212529',
  '#495057',
  '#ced4da',
  '#f8f9fa',
  '#3b82f6',
  '#10b981',
  '#ef4444',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#e11d48',
  '#78350f',
]
export const SHOE_COLORS = ['#212529', '#f8f9fa', '#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#78350f', '#8b5cf6']

interface Props {
  activeCategory: CategoryKey
  avatar: AvatarConfig
  onChangeAvatar: (newAvatar: AvatarConfig) => void
}

export const ColorPalettePicker: React.FC<Props> = ({ activeCategory, avatar, onChangeAvatar }) => {
  return (
    <div className="pt-3 border-t border-[#383a40] flex items-center gap-2 overflow-x-auto pb-1">
      {activeCategory === 'skin' &&
        SKIN_TONES.map((color) => (
          <button
            key={color}
            onClick={() => onChangeAvatar({ ...avatar, skinTone: color })}
            className={`w-7 h-7 rounded-full border-2 transition-all shrink-0 ${
              avatar.skinTone === color ? 'border-white scale-110 shadow-lg' : 'border-transparent'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}

      {(activeCategory === 'hair' || activeCategory === 'facialHair') &&
        HAIR_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => {
              if (activeCategory === 'hair') onChangeAvatar({ ...avatar, hairColor: color })
              else onChangeAvatar({ ...avatar, facialHairColor: color })
            }}
            className={`w-7 h-7 rounded-full border-2 transition-all shrink-0 ${
              (activeCategory === 'hair' ? avatar.hairColor : avatar.facialHairColor) === color
                ? 'border-white scale-110 shadow-lg'
                : 'border-transparent'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}

      {(activeCategory === 'top' ||
        activeCategory === 'jacket' ||
        activeCategory === 'bottom' ||
        activeCategory === 'hat' ||
        activeCategory === 'glasses' ||
        activeCategory === 'other') &&
        FABRIC_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => {
              if (activeCategory === 'top') onChangeAvatar({ ...avatar, topColor: color })
              else if (activeCategory === 'jacket') onChangeAvatar({ ...avatar, jacketColor: color })
              else if (activeCategory === 'bottom') onChangeAvatar({ ...avatar, bottomColor: color })
              else if (activeCategory === 'hat') onChangeAvatar({ ...avatar, hatColor: color })
              else if (activeCategory === 'glasses') onChangeAvatar({ ...avatar, glassesColor: color })
              else if (activeCategory === 'other') onChangeAvatar({ ...avatar, otherColor: color })
            }}
            className={`w-7 h-7 rounded-full border-2 transition-all shrink-0 ${
              (activeCategory === 'top'
                ? avatar.topColor
                : activeCategory === 'jacket'
                ? avatar.jacketColor
                : activeCategory === 'bottom'
                ? avatar.bottomColor
                : activeCategory === 'hat'
                ? avatar.hatColor
                : activeCategory === 'glasses'
                ? avatar.glassesColor
                : avatar.otherColor) === color
                ? 'border-white scale-110 shadow-lg'
                : 'border-transparent'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}

      {activeCategory === 'shoes' &&
        SHOE_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onChangeAvatar({ ...avatar, shoesColor: color })}
            className={`w-7 h-7 rounded-full border-2 transition-all shrink-0 ${
              avatar.shoesColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
    </div>
  )
}
