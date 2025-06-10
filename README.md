# LncRAnalyzer-GUI
 A web-based interface for lncRNAs and Novel Protein Coding Transcripts (NPCTs) identification using RNA-Seq

## Introduction
A modern web-based graphical user interface for the LncRAnalyzer bioinformatics pipeline, designed for lncRNAs and Novel Protein Coding Transcripts (NPCT) identification using RNA-Seq. The pipeline contains several steps including quality control, read alignment to reference genome, reference-guided transcript assembly, merge annotations, annotation comparison, class code selection, and retrieval of transcripts in FASTA format. The putative class code selected transcripts will be further evaluated for their coding potentials, features, and protein domain homologies using CPC2, CPAT, PLEK (Time-consuming), RNAsamba, LncFinder, LGC, and PfamScan. The final lncRNAs and NPCTs will be selected based on coding potentials, features, and protein domain homologies. Additionally, if LiftOver files for the organism and related species is provided; this pipeline also performs cross-species lncRNA conservation analysis using Slncky. We also integrated the FEELnc plugin to report the mRNA spliced and intergenic lncRNAs in given RNA-seq samples. For NPCTs, further functional annotations is needed which includes peptide sequences prediction using TransDecoder followed by homology searches using Pfamscan, BLASTP, and BLASTX. The entire workflow is automated using Bpipe and could be implemented in multiple working environment such as Conda, Docker and Singularity..

## Features

- **User-Friendly Interface**: Modern React-based web interface with drag-and-drop file uploads
- **Complete Pipeline Integration**: Direct integration with the LncRAnalyzer Docker container (`nikhilshinde0909/lncranalyzer:latest`)
- **Real-Time Progress Tracking**: Live status updates during pipeline execution
- **Comprehensive Parameter Support**: Support for all parameters from the Galaxy XML specification
- **File Format Validation**: Automatic validation of bioinformatics file formats (FASTQ, FASTA, GTF)
- **Organism Support**: Support for both vertebrates and plants clades
- **Related Species Analysis**: Compare your organism with related species for enhanced analysis

## System Requirements

### Prerequisites
- **Docker**: Version 20.0 or higher
- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **System Memory**: Minimum 8GB RAM (16GB recommended for large datasets)
- **Storage**: At least 50GB free space for analysis results

### Supported File Formats
- **FASTQ files**: Raw sequencing reads (R1 and R2)
- **FASTA files**: Genome, rRNA and known lncRNAs sequences
- **GTF files**: Gene annotations
- **BED files**: non-coding gene annotations in bed12 format
- **Chain files**: Liftover mappings (optional)
- **Design file**: Experimental design (optional)

## Installation

### 1. Clone the Repository
```bash
git clone https://gitlab.com/nikhilshinde0909/LncRAnalyzer-GUI.git
cd LncRAnalyzer-GUI
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Pull the LncRAnalyzer Docker Image
```bash
docker pull nikhilshinde0909/lncranalyzer:latest
```

### 4. Create Required Inputs in Working Directory
```
Working directory
  ├── SRR975551_1.fastq.gz
  ├── SRR975552_1.fastq.gz
  └── (and other fastq.gz files)
  ├── SRR975551_2.fastq.gz
  ├── SRR975552_2.fastq.gz
  └── (and other fastq.gz files)
  └── hg38.rRNA.fasta
  └── hg38.genome.fasta
  └── hg38.annotation.gtf
  └── (and other files) 

```

## Usage

### Starting the Application
```bash
npm run lncranalyzer
```

This will automatically open web browser tab `http://localhost:5000`

### Running an Analysis

1. **Fill Required Parameters**:
   - **Organism Name**: Scientific name  separted by underscore (e.g., `Homo_sapiens`, `Sorghum_bicolor`)
   - **Clade**: Select either `vertebrates` or `plants`
   - **Related Species Name**: Scientific name of related species for comparison

2. **Upload Required Files**:
   - **R1 Reads**: Upload one or more compressed FASTQ files (*.gz) containing forward reads
   - **R2 Reads**: Upload compressed FASTQ files (*.gz) reverse reads (optional for single-end sequencing)
   - **Genome**: Reference genome in FASTA format
   - **Annotation**: Gene annotation in GTF format
   - **rRNA Sequences**: ribosomal RNA sequences in FASTA format

3. **Upload Related Species Files**:
   - **Related Species Genome**: Reference genome of related species
   - **Related Species Annotation**: Gene annotation of related species

4. **Optional Files** (expand sections as needed):
   - Liftover chain files
   - Non-coding RNA databases
   - miRNA and snoRNA files in bed12 format
   - Known lncRNA databases
   - Experimental design file

5. **Submit Pipeline**: Click "Run Pipeline" to start the analysis

6. **Monitor Progress**: Track real-time progress through the status interface

### Example Dataset

For testing, you can use publicly available datasets:

**Sorghum bicolor Analysis:**
- Organism: `Sorghum_bicolor`
- Clade: `plants`
- Related Species: `Zea_mays`
- Reads: SRA files like `SRR8742958.fastq.gz`, `SRR8742959.fastq.gz`
- Genome: Ensembl Plants genome assemblies
- Annotation: Ensembl Plants GTF annotations

## Pipeline Steps

The LncRAnalyzer pipeline executes the following steps:

1. **Adapter Trimming**: Assess read quality and generate QC reports
2. **rRNA Removal**: Remove reads resembles rRNA sequences
3. **Genome Alignment**: Map reads to reference genome using STAR/HISAT2
4. **Transcript Assembly**: Assemble transcripts using StringTie/Cufflinks
5. **LncRNA Identification**: Classify transcripts and identify lncRNAs
6. **Functional Analysis**: Identify TE derived lncRNAs
7. **Report Generation**: lncRNA and NPCT outputs 

## File Organization

```
lncranalyzer-gui/
├── client/                 
│   ├── src/
│   │   ├── components/     
│   │   ├── pages/        
│   │   └── lib/           
├── server/               
│   ├── index.ts          
│   ├── routes.ts          
│   └── storage.ts         
├── shared/                
├── jobs/                  
├── uploads/              
└── README.md            
```

## API Endpoints

### Pipeline Management
- `POST /api/pipeline/run` - Submit new pipeline job
- `GET /api/pipeline/status/:jobId` - Get job status
- `GET /api/pipeline/download/:jobId` - Download results

### Job Status Values
- `running` - Pipeline is executing
- `completed` - Analysis finished successfully
- `failed` - Pipeline encountered an error

## Docker Integration

The application automatically manages Docker container execution with the following features:

- **Automatic Volume Mounting**: Input and output directories are mounted to the container
- **Parameter Mapping**: GUI parameters are translated to command-line arguments
- **Progress Monitoring**: Real-time parsing of Docker container output
- **Resource Management**: Containers are automatically cleaned up after execution

### Docker Command Example
```bash
docker run --rm \
  -v /path/to/input:/input \
  nikhilshinde0909/lncranalyzer:latest \
  /pipeline/LncRAnalyzer/Main.groovy \
  /input/data.groovy
```

## Troubleshooting

### Common Issues

1. **Docker Not Found**
   ```
   Error: Docker execution error: spawn docker ENOENT
   ```
   - Ensure Docker is installed and running
   - Verify Docker is in your system PATH

2. **Permission Denied**
   ```
   Error: Permission denied
   ```
   - Check file permissions in the jobs directory
   - Ensure Docker has access to mount directories

3. **Out of Memory**
   ```
   Docker process failed with code 137
   ```
   - Increase system memory or Docker memory limits
   - Use smaller datasets for testing

4. **Invalid File Format**
   ```
   Validation error: Invalid file format
   ```
   - Verify uploaded files are in correct format (FASTQ, FASTA, GTF)
   - Check file extensions match content

### Log Files

Pipeline logs are available in:
- Browser console for frontend issues
- Server console for backend and Docker issues
- Individual job directories for pipeline-specific logs

## Development

### Project Structure
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Express + TypeScript
- **Database**: In-memory storage (easily replaceable)
- **File Handling**: Multer for uploads
- **Validation**: Zod schemas for type safety

### Running in Development Mode
```bash
npm run dev
```

### Building for Production
```bash
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Citation

If you use this GUI in your research, please cite:

```
LncRAnalyzer: A Robust Workflow for Long Non-Coding RNA Discovery using RNA-Seq  
Authors: Nikhil Shinde¹, Shaik Habeeb Mohideen¹, Raja Natesan Sella¹*  
¹ SRM Institute of Science and Technology, Kattankulathur, Tamil Nadu 603203, India
```

## Support

For issues and questions:
- Check the troubleshooting section above
- Review Docker container documentation
- Open an issue in the repository

## Acknowledgments

- LncRAnalyzer Docker container by nikhilshinde0909
- Galaxy Project for pipeline specification
- React and Express communities for excellent frameworks
