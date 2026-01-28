import SuperJSON from 'superjson'
import type {PersistStorage} from 'zustand/middleware'

export const serializedStorage: PersistStorage<unknown> = {
  getItem: (name) => {
    const str = localStorage.getItem(name)
    if (str === null) {
      return null
    }
    return SuperJSON.parse(str)
  },
  setItem: (name, newValue) =>
    localStorage.setItem(name, SuperJSON.stringify(newValue)),
  removeItem: (name) => localStorage.removeItem(name),
}
