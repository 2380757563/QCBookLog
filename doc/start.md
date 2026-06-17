# 终端 1 - 启动前端
cd /home/project/QCBookLog
npm run dev

# 终端 2 - 启动后端
cd /home/project/QCBookLog/server
export TANSHU_API_KEY=bc621345d6f1908f5fff0c062708ed1d
export DOUBAN_API_KEY=0ac44ae016490db2204ce0a042db2916
export ISBN_WORK_API_KEY=ae1718d4587744b0b79f940fbef69e77
npm run dev