// Tambahkan tab ke dokumen yang diindeks
site.tabs.forEach(tab => {
  lunrIndex.add({
    id: tab.url,
    title: tab.title,
    content: tab.content
  });
});

