import readingTime from 'reading-time'

type Post = {
  title: string
  file: string
  rawContent?: () => string
  body?: {
    raw?: string
  }
  content?: string
}

export default function getPostData(post: Post) {
  let content = '';
  
  // Try different ways to get content
  if (post.rawContent) {
    content = post.rawContent();
  } else if (post.body?.raw) {
    content = post.body.raw;
  } else if (post.content) {
    content = post.content;
  }

  // Add debug logging
  // console.log('Post file:', post.file);
  // console.log('Content available:', {
  //   hasRawContent: !!post.rawContent,
  //   hasBodyRaw: !!post.body?.raw,
  //   hasContent: !!post.content
  // });
  
  return {
    slug: post.file.split('/').pop().split('.').shift(),
    readingTime: readingTime(content).text,
  }
}