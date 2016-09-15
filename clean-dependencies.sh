#!/bin/bash
set +e

echo "...Updating from Git..."
git pull
echo "...Removing old Bower components and Dist..."
rm -rf ./bower_components
rm -rf ./dist
echo "...Updating Bower with new install..."
bower install