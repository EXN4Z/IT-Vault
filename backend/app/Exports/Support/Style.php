<?php

namespace App\Exports\Support;

use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Desain laporan Excel Marimas IT Vault: pita biru + logo, garis emas, keterangan,
 * header biru gelap, baris zebra, footer. Dipakai bersama oleh semua export bergaya laporan.
 */
final class Style
{
    public const BARIS_HEADER = 6;

    private const BIRU_PITA   = '0B2A6B';
    private const BIRU_HEADER = '081F4F';
    private const EMAS        = 'C9A227';
    private const TEKS        = '1E293B';
    private const ABU         = '64748B';
    private const GARIS       = 'D6DEE8';
    private const ZEBRA       = 'F1F5F9';

    private const CAKUPAN = [
        'all'      => 'seluruh data',
        'filtered' => 'sesuai filter saat ini',
        'page'     => 'pada halaman ini',
    ];

    /**
     * @param string   $judul        mis. "Data Inventory"
     * @param string   $nama         kata benda untuk keterangan, mis. "inventory"
     * @param string   $cakupan      all | filtered | page
     * @param int|null $tinggiBaris  tinggi tetap baris data (null = otomatis, cocok untuk teks yang dibungkus)
     * @return array{awal:int, akhir:int, kolomAkhir:string}  baris data pertama & terakhir, huruf kolom terakhir
     */
    public static function terapkan(
        Worksheet $s,
        string $judul,
        string $nama,
        string $cakupan,
        int $jumlahKolom,
        int $total,
        ?int $tinggiBaris = null,
    ): array {
        $hdr        = self::BARIS_HEADER;
        $kolomAkhir = Coordinate::stringFromColumnIndex($jumlahKolom);
        $awal       = $hdr + 1;
        $akhir      = $hdr + $total;
        $sekarang   = Carbon::now()->locale('id');

        // ---------- pita judul (baris 1-2) ----------
        $s->getStyle("A1:{$kolomAkhir}2")->getFill()
            ->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB(self::BIRU_PITA);
        $s->getRowDimension(1)->setRowHeight(24);
        $s->getRowDimension(2)->setRowHeight(22);

        $logo = public_path('images/logo.png');
        if (is_file($logo)) {
            $d = new Drawing();
            $d->setName('Logo');
            $d->setPath($logo);
            $d->setHeight(42);
            $d->setCoordinates('A1');
            $d->setOffsetX(8);
            $d->setOffsetY(3);
            $d->setWorksheet($s);
        }

        // judul di sebelah logo (mulai kolom C kalau cukup kolom)
        $kolJudul = $jumlahKolom >= 3 ? 'C' : ($jumlahKolom === 2 ? 'B' : 'A');
        $s->setCellValue("{$kolJudul}1", 'MARIMAS IT VAULT — ' . $judul);
        $s->mergeCells("{$kolJudul}1:{$kolomAkhir}2");
        $s->getStyle("{$kolJudul}1")->applyFromArray([
            'font' => ['bold' => true, 'size' => 14, 'color' => ['rgb' => 'FFFFFF']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);

        // ---------- garis emas (baris 3) ----------
        $s->mergeCells("A3:{$kolomAkhir}3");
        $s->getStyle("A3:{$kolomAkhir}3")->getFill()
            ->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB(self::EMAS);
        $s->getRowDimension(3)->setRowHeight(4);

        // ---------- keterangan (baris 4) ----------
        $s->setCellValue(
            'A4',
            "{$total} {$nama} " . (self::CAKUPAN[$cakupan] ?? self::CAKUPAN['all'])
            . "   •   Total data: {$total}   •   Digenerate: "
            . $sekarang->translatedFormat('j F Y \p\u\k\u\l H.i')
        );
        $s->mergeCells("A4:{$kolomAkhir}4");
        $s->getStyle('A4')->applyFromArray([
            'font' => ['italic' => true, 'size' => 9, 'color' => ['rgb' => self::ABU]],
            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $s->getRowDimension(4)->setRowHeight(18);

        // ---------- spasi (baris 5) ----------
        $s->getRowDimension(5)->setRowHeight(4);

        // ---------- header tabel (baris 6) ----------
        $s->getStyle("A{$hdr}:{$kolomAkhir}{$hdr}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 10, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => self::BIRU_HEADER]],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_LEFT,
                'vertical'   => Alignment::VERTICAL_CENTER,
                'wrapText'   => true,
            ],
            'borders' => ['allBorders' => [
                'borderStyle' => Border::BORDER_THIN,
                'color' => ['rgb' => self::BIRU_HEADER],
            ]],
        ]);
        $s->getRowDimension($hdr)->setRowHeight(22);

        // ---------- isi tabel ----------
        if ($total > 0) {
            $s->getStyle("A{$awal}:{$kolomAkhir}{$akhir}")->applyFromArray([
                'font' => ['size' => 10, 'color' => ['rgb' => self::TEKS]],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_LEFT,
                    'vertical'   => Alignment::VERTICAL_CENTER,
                ],
                'borders' => ['allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => self::GARIS],
                ]],
            ]);

            // zebra: baris data ke-2, 4, 6, ...
            for ($r = $awal + 1; $r <= $akhir; $r += 2) {
                $s->getStyle("A{$r}:{$kolomAkhir}{$r}")->getFill()
                    ->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB(self::ZEBRA);
            }

            if ($tinggiBaris !== null) {
                for ($r = $awal; $r <= $akhir; $r++) {
                    $s->getRowDimension($r)->setRowHeight($tinggiBaris);
                }
            }
        }

        // ---------- freeze, filter, cetak ----------
        $s->freezePane('A' . $awal);
        $s->setAutoFilter("A{$hdr}:{$kolomAkhir}{$hdr}");
        $s->getPageSetup()
            ->setOrientation(PageSetup::ORIENTATION_LANDSCAPE)
            ->setFitToPage(true)
            ->setFitToWidth(1)
            ->setFitToHeight(0);

        // ---------- footer: kata "digenerate otomatis" dipakai import untuk menyaring baris ini ----------
        $baris = $akhir + 2;
        $s->setCellValue("A{$baris}", 'Dokumen digenerate otomatis oleh Marimas IT Vault — tidak memerlukan tanda tangan basah.');
        $s->mergeCells("A{$baris}:{$kolomAkhir}{$baris}");
        $s->getStyle("A{$baris}")->applyFromArray([
            'font' => ['italic' => true, 'size' => 8, 'color' => ['rgb' => self::ABU]],
        ]);

        return ['awal' => $awal, 'akhir' => $akhir, 'kolomAkhir' => $kolomAkhir];
    }
}