/**
 * Data service for managing items
 */
class DataService {
  constructor() {
    this.items = [];
  }

  addItem(item) {
    this.items.push(item);
  }

  getItems() {
    return this.items;
  }
}

module.exports = { DataService };
