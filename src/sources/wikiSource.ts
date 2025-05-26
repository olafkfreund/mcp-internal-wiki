export class WikiSource {
  name = 'wiki';
  // In a real implementation, load and index wiki URLs from config
  getContext(params: any) {
    // Return relevant wiki content for the query (stub)
    return [{
      title: 'Example Wiki Page',
      content: 'This is a sample wiki page content.'
    }];
  }
}
