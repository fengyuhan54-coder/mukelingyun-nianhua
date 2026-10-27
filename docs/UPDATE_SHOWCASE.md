# 如何更新 GitHub 展示

GitHub 仓库首页展示根目录的 README.md。修改该文件和 docs/assets/ 图片并推送，即可更新首页，不需要重新部署网站。

## 本次更新

在项目根目录的 PowerShell 依次执行：

```powershell
git status --short
git add README.md docs
git diff --cached --stat
git commit -m "docs: improve project showcase with screenshots and diagrams"
git push
```

只加入本次 README 和 docs 文档改动，确认列表不包含密钥文件。推送完成后刷新 GitHub 仓库首页即可。

## 以后替换图片

1. 把新截图保存到 docs/assets/，避免包含密钥、个人资料或私人演示入口。
2. 在 README.md 中修改对应图片路径；文件名使用小写英文与连字符。
3. 更新 docs/GALLERY.md 中的来源说明。
4. 再按上面的步骤提交和推送。

仓库图像路径区分大小写。若图片不显示，先检查文件是否已提交，以及路径和文件名是否一致。
