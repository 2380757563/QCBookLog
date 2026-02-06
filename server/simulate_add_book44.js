import databaseService from './services/databaseService.js';

console.log('开始模拟添加书籍44（与前端发送的数据相同）\n');

// 使用与前端发送的完全相同的书籍数据
const bookData = {
  isbn: "9787572608582",
  title: "长安的荔枝",
  author: "马伯庸",
  publisher: "湖南文艺出版社",
  publishYear: 2022,
  pages: 224,
  binding1: 1,
  binding2: 0,
  book_type: 1,
  coverUrl: "/api/douban/cover/s34327482",
  purchaseDate: "2026-02-04T11:34:35.022Z",
  standardPrice: 45,
  readStatus: "未读",
  rating: 4.3,
  tags: ["小说", "历史", "马伯庸", "中国", "文学", "中国文学", "历史小说", "2023", "2022", "职场"],
  groups: [],
  series: "博集天卷·马伯庸作品",
  note: "",
  description: "大唐天宝十四年，长安城的小吏李善德突然接到一个任务：要在贵妃诞日之前，从岭南运来新鲜荔枝。荔枝\"一日色变，两日香变，三日味变\"，而岭南距长安五千余里，山水迢迢，这是个不可能完成的任务，可为了家人，李善德决心放手一搏：\"就算失败，我也想知道，自己倒在距离终点多远的地方。\"    《长安的荔枝》是马伯庸备受好评的历史小说。    唐朝诗人杜牧的一句\"一骑红尘妃子笑，无人知是荔枝来\"一千多年来引发了人们的无限遐想，但鲜荔枝的保鲜时限仅有三天，这场跨越五千余里的传奇转运之旅究竟是如何达成的，谁让杨贵妃在长安吃到了来自岭南的鲜荔枝？作者马伯庸就此展开了一场脑洞非常大的想象。    沿袭马伯庸写作一贯以来的时空紧张感，不仅让读者看到了小人物的乱世生存之道，也感受到了事在人为的热血奋斗。随书附赠\"荔枝鲜转运舆图\"。    ★ 编辑推荐    唐朝诗人杜牧的一句\"一骑红尘妃子笑，无人知是荔枝来\"惹得世人艳羡杨贵妃上千年，但其中的荔枝是如何从五千余里外的岭南运送到长安城的，却鲜有史书详细记载，脑洞大开的马伯庸以此为蓝本构建了一个大唐社畜李善德拼尽全力做项目的故事，虽是历史小说，读者却能从中看到自己的生活影子，大城市买房落脚、职场情商博弈、不得已的违规逾矩等，小人物的挣扎是那么相似。一项将鲜荔枝运逾千里之距的艰难差事，以微观人事折射大唐宏观社会。    这部口碑非常好的历史小说只花了11天写就，小说刚一连载就获得了广大读者的好评，被数万人点评为神作，推荐值高达96%。微博、抖音、小红书和今日头条，海量读者自发评论和衍生二创。    本书小开本双封设计，随书附赠\"荔枝鲜转运舆图\"折页插图一张。    ★ 媒体推荐    马伯庸把他对历史的熟稔与现实关怀结合在一起，使得文笔能直击人的内心。写的是古人，却经常让我们看到自己。这部《长安的荔枝》就是如此。    ——陕西师范大学历史文化学院教授 于赓哲"
};

console.log('书籍数据:', JSON.stringify(bookData, null, 2));

try {
  console.log('\n调用addBookToDB方法...\n');
  const result = databaseService.addBookToDB(bookData);
  console.log('\n✅ 添加成功');
  console.log('书籍ID:', result.id);
  console.log('ISBN:', result.isbn);
  console.log('描述长度:', result.description?.length || 0);
  console.log('标签数量:', result.tags?.length || 0);
} catch (error) {
  console.log('\n❌ 添加失败:', error.message);
  console.log('错误堆栈:', error.stack);
}
