read -p "Would you like to cut a release? " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    gh workflow run release.yml
fi
