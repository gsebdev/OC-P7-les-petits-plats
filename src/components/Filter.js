export default class Filter {
  constructor (container, filters) {
    this._filters = filters.map(filter => {
      filter.suggestions = []
      filter.input = ''
      filter.element = null
      filter.tags = new Set()
      return filter
    })

    // Insert DOM in Html
    this._componentContainer = document.querySelector(container)

    this._tagsEl = document.createElement('div')
    this._tagsEl.className = 'filters__tags'

    this._filtersContainer = document.createElement('div')
    this._filtersContainer.className = 'filters__container'

    this._filters.forEach((filter, index) => {
      filter.element = this.getFilterDOM(filter, index)
      this._filtersContainer.appendChild(filter.element)
    })
    this._componentContainer.append(this._tagsEl, this._filtersContainer)

    this._activeFilter = null
    this._triggerTagChange = null
  }

  // Getter resolving a Promise when tag modification
  get onchange () {
    return new Promise(resolve => { this._triggerTagChange = resolve })
  }

  get tags () {
    const tags = []
    this._filters.forEach(filter => {
      if (filter.tags.size !== 0) {
        tags.push(...filter.tags)
      }
    })
    return tags
  }

  // DOM template for one filter element
  getFilterDOM (filter) {
    const filterEl = document.createElement('div')
    filterEl.className = 'filter filter--' + filter.color

    const inputContainer = document.createElement('div')
    inputContainer.className = 'filter__input'

    const input = document.createElement('input')
    input.placeholder = filter.name
    input.type = 'text'
    input.addEventListener('input', (e) => this.handleInput(e, filter))
    input.addEventListener('click', (e) => this.handleKeyDown(e, filter))
    input.addEventListener('keydown', (e) => this.handleKeyDown(e, filter))

    const arrowIcon = document.createElement('i')
    arrowIcon.addEventListener('click', () => this.toggleFilterActivation(filter))

    inputContainer.append(input, arrowIcon)

    const suggestedList = document.createElement('ul')
    suggestedList.className = 'filter__list'

    filterEl.append(inputContainer, suggestedList)

    return filterEl
  }

  feedSuggestions (listOfObjects) {
    const suggestions = {}
    this._filters.forEach(filter => {
      suggestions[filter.filterKey] = []
    })
    // Make a Set for each filter containing all the suggestions based on the recipe list
    if (listOfObjects.length !== 0) {
      listOfObjects.forEach(object => {
        this._filters.forEach(filter => {
          suggestions[filter.filterKey] = [...suggestions[filter.filterKey], ...object.filters[filter.filterKey]]
          // Using a Set avoid duplicates and then transforming it again in an array
          filter.suggestions = [...new Set(suggestions[filter.filterKey])]
          this.updateSuggestions(filter)
        })
      })
    } else {
      this._filters.forEach(filter => {
        filter.suggestions = []
        this.updateSuggestions(filter)
      })
    }
  }

  updateSuggestions (filter) {
    // Removes suggestions from the suggestion list function of actual filter input
    let suggestions = filter.suggestions.filter(suggestion => suggestion.toLowerCase().indexOf(filter.input.toLowerCase()) !== -1)
    // Removes suggestions from the suggestion list function of tags already added
    suggestions = suggestions.filter(suggestion => {
      return !filter.tags.has(suggestion.toLowerCase())
    })

    const filterListEl = filter.element.querySelector('.filter__list')
    // empty suggestion list
    filterListEl.innerHTML = ''
    filterListEl.classList.remove('col-2', 'col-1')
    // define the number of columns that will be displayed
    if (suggestions.length <= 10) {
      filterListEl.classList.add('col-1')
    } else if (suggestions.length <= 20) {
      filterListEl.classList.add('col-2')
    }
    suggestions.forEach(suggestion => {
      // adds every suggestions to html
      const suggestEl = document.createElement('li')
      suggestEl.textContent = suggestion
      suggestEl.addEventListener('click', (e) => this.handleSuggestionClick(e, filter))
      filterListEl.append(suggestEl)
    })
  }

  // Event handlers
  handleInput (e, filter) {
    filter.input = e.target.value
    this.updateSuggestions(filter)

    if (!filter.element.classList.contains('expanded')) {
      this.activateFilter(filter)
    }
  }

  handleKeyDown (e, filter) {
    switch (e.which) {
      // tab and shift+tab
      case 9 : {
        if (filter.element.classList.contains('expanded')) {
          e.preventDefault()
          const firstSuggestion = filter.element.querySelector('.filter__list li:first-child')
          const lastSuggestion = filter.element.querySelector('.filter__list li:last-child')
          const suggestionFocus = filter.element.querySelector('.filter__list li.focus')
          let newSuggestionFocus
          if (e.shiftKey === true) {
            if (suggestionFocus) {
              suggestionFocus.classList.remove('focus')
              newSuggestionFocus = suggestionFocus !== firstSuggestion ? suggestionFocus.previousElementSibling : lastSuggestion
            } else { newSuggestionFocus = lastSuggestion }
          } else {
            if (suggestionFocus) {
              suggestionFocus.classList.remove('focus')
              newSuggestionFocus = suggestionFocus !== lastSuggestion ? suggestionFocus.nextElementSibling : firstSuggestion
            } else {
              newSuggestionFocus = firstSuggestion
            }
          }
          newSuggestionFocus.classList.add('focus')
          e.target.value = newSuggestionFocus.textContent
        }
        break
      }
      // click and enter
      case 1 :
      case 13 : {
        e.preventDefault()
        const value = e.target.value
        if (value.length < 3) {
          this.activateFilter(filter)
        } else {
          this.addTag(filter, value)
          e.target.value = ''
          filter.input = ''
          this.updateSuggestions(filter)
        }

        break
      }
      // escape key
      case 27 : {
        e.preventDefault()
        this.desactivateFilter(filter)
      }
    }
  }

  handleSuggestionClick (e, filter) {
    e.preventDefault()
    e.stopImmediatePropagation()
    this.addTag(filter, e.target.textContent)
  }

  handleDocumentClick (e, filter) {
    if (e.target.closest('.filter') !== filter.element) {
      this.desactivateFilter(filter)
    }
  }

  // Methods that display suggestions for one filter
  activateFilter (filter) {
    this._activeFilter = filter.element
    this._filters.forEach(f => {
      if (f.element !== this._activeFilter) {
        this.desactivateFilter(f)
      }
    })
    document.onclick = (e) => this.handleDocumentClick(e, filter)
    filter.element.classList.add('expanded')
    const input = filter.element.querySelector('input')
    input.setAttribute('placeholder', 'Rechercher un ' + filter.name.slice(0, -1).toLowerCase())
  }

  desactivateFilter (filter) {
    if (this._activeFilter === filter.element) {
      this._activeFilter = null
    }
    document.onclick = ''
    filter.element.classList.remove('expanded')
    filter.input = ''
    const input = filter.element.querySelector('input')
    input.placeholder = filter.name
    input.value = ''
    this.updateSuggestions(filter)
  }

  toggleFilterActivation (filter) {
    if (this._activeFilter === filter.element) {
      this.desactivateFilter(filter)
    } else {
      this.activateFilter(filter)
    }
  }

  // Methods that adds, removes, display, reset tags
  addTag (filter, value) {
    if (value.length < 3) {
      return false
    }
    if (!filter.tags.has(value.toLowerCase())) {
      filter.tags.add(value.toLowerCase())
      // create tag element DOM
      const tagEl = document.createElement('span')
      tagEl.className = 'tag tag--' + filter.color
      tagEl.textContent = value
      const closeIcon = document.createElement('i')
      closeIcon.addEventListener('click', (e) => this.removeTag(e, filter, value.toLowerCase()))
      tagEl.appendChild(closeIcon)

      this._tagsEl.appendChild(tagEl)
      this.updateSuggestions(filter)
      this.desactivateFilter(filter)
      this._triggerTagChange()
    }
  }

  removeTag (e, filter, value) {
    filter.tags.delete(value)
    e.target.closest('.tag').remove()
    this.updateSuggestions(filter)
    this._triggerTagChange()
  }

  resetAllTags () {
    this._filters.forEach(filter => {
      filter.tags.clear()
      this._tagsEl.querySelectorAll('.tag').forEach(tag => tag.remove())
    })
  }
}
