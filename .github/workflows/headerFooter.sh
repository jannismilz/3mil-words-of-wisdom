#!/usr/bin/env bash

while getopts a:t:v: flag
do
    case "${flag}" in
        a) author=${OPTARG};;
        t) title=${OPTARG};;
        v) version=${OPTARG};;
    esac
done

# Install necessary package
sudo apt-get update
sudo apt-get install -y pdftk imagemagick texlive-latex-base texlive-fonts-recommended texlive-fonts-extra texlive-latex-extra
# Delete policy to prevent errors (yeah not the clean way)
sudo rm /etc/ImageMagick-6/policy.xml

pdf_chapters_path="pdfs/chapters.pdf"
pdf_no_toc_path="pdfs/noToC.pdf"

chapters_page_count=$(pdftk $pdf_chapters_path dump_data | grep NumberOfPages)
temp=(${chapters_page_count// / })
chapters_page_count=${temp[1]}

no_toc_page_count=$(pdftk $pdf_no_toc_path dump_data | grep NumberOfPages)
temp=(${no_toc_page_count// / })
no_toc_page_count=${temp[1]}

toc_page_count=$(expr $chapters_page_count - $no_toc_page_count)

# Create blank pdf with as many blank pages as the ToC is long
for (( i=1; i<=$toc_page_count; i++ )); do convert xc:none -page A4 roman$i.pdf; done

pdftk roman*.pdf cat output romanBlank.pdf

pdflatex "\def\author{$author} \def\title{$title} \def\version{$version} \def\pdfDoc{romanBlank.pdf} \input{./.github/workflows/headerFooter.tex}"

mv headerFooter.pdf ./.github/workflows/roman.pdf

# Create blank pdf with as many blank pages as the noToC is long
for (( i=1; i<=$no_toc_page_count; i++ )); do convert xc:none -page A4 arabic$i.pdf; done

pdftk arabic*.pdf cat output arabicBlank.pdf

pdflatex "\def\author{$author} \def\title{$title} \def\version{$version} \def\pdfDoc{arabicBlank.pdf} \def\numberingType{arabic} \input{./.github/workflows/headerFooter.tex}"

mv headerFooter.pdf ./.github/workflows/arabic.pdf

pdftk ./.github/workflows/roman.pdf ./.github/workflows/arabic.pdf cat output ./.github/workflows/stamps.pdf

pdftk $pdf_chapters_path multistamp ./.github/workflows/stamps.pdf output pdfs/finalChapters.pdf